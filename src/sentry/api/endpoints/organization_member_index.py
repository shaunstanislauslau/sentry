from __future__ import absolute_import
import six

from django.db import transaction
from django.db.models import Q, F
from rest_framework import serializers
from rest_framework.response import Response
from django.conf import settings

from sentry.app import locks
from sentry import roles, features
from sentry.api.bases.organization import OrganizationEndpoint, OrganizationPermission
from sentry.api.paginator import OffsetPaginator
from sentry.api.serializers import serialize
from sentry.api.serializers.rest_framework import ListField
from sentry.api.validators import AllowedEmailField
from sentry.models import (
    AuditLogEntryEvent,
    InviteStatus,
    OrganizationMember,
    OrganizationMemberTeam,
    Team,
    TeamStatus,
)
from sentry.models.authenticator import available_authenticators
from sentry.search.utils import tokenize_query
from sentry.signals import member_invited
from .organization_member_details import get_allowed_roles
from sentry.utils.retries import TimedRetryPolicy


@transaction.atomic
def save_team_assignments(organization_member, teams):
    # teams may be empty
    OrganizationMemberTeam.objects.filter(organizationmember=organization_member).delete()
    OrganizationMemberTeam.objects.bulk_create(
        [
            OrganizationMemberTeam(team=team, organizationmember=organization_member)
            for team in teams
        ]
    )


class MemberPermission(OrganizationPermission):
    scope_map = {
        "GET": ["member:read", "member:write", "member:admin"],
        "POST": ["member:write", "member:admin"],
        "PUT": ["member:write", "member:admin"],
        "DELETE": ["member:admin"],
    }


class OrganizationMemberSerializer(serializers.Serializer):
    email = AllowedEmailField(max_length=75, required=True)
    role = serializers.ChoiceField(choices=roles.get_choices(), required=True)
    teams = ListField(required=False, allow_null=False, default=[])
    sendInvite = serializers.BooleanField(required=False, default=True, write_only=True)

    def validate_email(self, email):
        queryset = OrganizationMember.objects.filter(
            Q(email=email) | Q(user__email__iexact=email, user__is_active=True),
            organization=self.context["organization"],
        )

        if queryset.filter(invite_status=InviteStatus.APPROVED.value).exists():
            raise serializers.ValidationError("The user %s is already a member" % email)

        if not self.context.get("allow_existing_invite_request"):
            if queryset.filter(
                Q(invite_status=InviteStatus.REQUESTED_TO_BE_INVITED.value)
                | Q(invite_status=InviteStatus.REQUESTED_TO_JOIN.value)
            ).exists():
                raise serializers.ValidationError(
                    "There is an existing invite request for %s" % email
                )
        return email

    def validate_teams(self, teams):
        valid_teams = list(
            Team.objects.filter(
                organization=self.context["organization"], status=TeamStatus.VISIBLE, slug__in=teams
            )
        )

        if len(valid_teams) != len(teams):
            raise serializers.ValidationError("Invalid teams")

        return valid_teams

    def validate_role(self, role):
        if role not in {r.id for r in self.context["allowed_roles"]}:
            raise serializers.ValidationError("You do not have permission to invite that role.")

        return role


class OrganizationMemberIndexEndpoint(OrganizationEndpoint):
    permission_classes = (MemberPermission,)

    def get(self, request, organization):
        queryset = (
            OrganizationMember.objects.filter(
                Q(user__is_active=True) | Q(user__isnull=True),
                organization=organization,
                invite_status=InviteStatus.APPROVED.value,
            )
            .select_related("user")
            .order_by("email", "user__email")
        )

        query = request.GET.get("query")

        if query:
            tokens = tokenize_query(query)
            for key, value in six.iteritems(tokens):
                if key == "email":
                    queryset = queryset.filter(
                        Q(email__in=value)
                        | Q(user__email__in=value)
                        | Q(user__emails__email__in=value)
                    )

                elif key == "scope":
                    queryset = queryset.filter(role__in=[r.id for r in roles.with_any_scope(value)])

                elif key == "role":
                    queryset = queryset.filter(role__in=value)

                elif key == "isInvited":
                    isInvited = "true" in value
                    queryset = queryset.filter(user__isnull=isInvited)

                elif key == "ssoLinked":
                    ssoFlag = OrganizationMember.flags["sso:linked"]
                    ssoLinked = "true" in value
                    if ssoLinked:
                        queryset = queryset.filter(flags=F("flags").bitor(ssoFlag))
                    else:
                        queryset = queryset.filter(flags=F("flags").bitand(~ssoFlag))

                elif key == "has2fa":
                    has2fa = "true" in value
                    if has2fa:
                        types = [a.type for a in available_authenticators(ignore_backup=True)]
                        queryset = queryset.filter(
                            user__authenticator__isnull=False, user__authenticator__type__in=types
                        )
                    else:
                        queryset = queryset.filter(user__authenticator__isnull=True)

                elif key == "query":
                    value = " ".join(value)
                    queryset = queryset.filter(
                        Q(email__icontains=value)
                        | Q(user__email__icontains=value)
                        | Q(user__name__icontains=value)
                    )
                else:
                    queryset = queryset.none()

        return self.paginate(
            request=request,
            queryset=queryset,
            on_results=lambda x: serialize(x, request.user),
            paginator_cls=OffsetPaginator,
        )

    def post(self, request, organization):
        """
        Add a Member to Organization
        ````````````````````````````

        Invite a member to the organization.

        :pparam string organization_slug: the slug of the organization the member will belong to
        :param string email: the email address to invite
        :param string role: the role of the new member
        :param array teams: the slugs of the teams the member should belong to.

        :auth: required
        """
        if not features.has("organizations:invite-members", organization, actor=request.user):
            return Response(
                {"organization": "Your organization is not allowed to invite members"}, status=403
            )

        _, allowed_roles = get_allowed_roles(request, organization)

        serializer = OrganizationMemberSerializer(
            data=request.data,
            context={
                "organization": organization,
                "allowed_roles": allowed_roles,
                "allow_existing_invite_request": True,
            },
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        result = serializer.validated_data

        with transaction.atomic():
            # remove any invitation requests for this email before inviting
            OrganizationMember.objects.filter(
                Q(invite_status=InviteStatus.REQUESTED_TO_BE_INVITED.value)
                | Q(invite_status=InviteStatus.REQUESTED_TO_JOIN.value),
                email=result["email"],
                organization=organization,
            ).delete()

            om = OrganizationMember(
                organization=organization,
                email=result["email"],
                role=result["role"],
                inviter=request.user,
            )

            if settings.SENTRY_ENABLE_INVITES:
                om.token = om.generate_token()
            om.save()

        if result["teams"]:
            lock = locks.get(u"org:member:{}".format(om.id), duration=5)
            with TimedRetryPolicy(10)(lock.acquire):
                save_team_assignments(om, result["teams"])

        if settings.SENTRY_ENABLE_INVITES and result.get("sendInvite"):
            om.send_invite_email()
            member_invited.send_robust(
                member=om, user=request.user, sender=self, referrer=request.data.get("referrer")
            )

        self.create_audit_entry(
            request=request,
            organization_id=organization.id,
            target_object=om.id,
            data=om.get_audit_log_data(),
            event=AuditLogEntryEvent.MEMBER_INVITE
            if settings.SENTRY_ENABLE_INVITES
            else AuditLogEntryEvent.MEMBER_ADD,
        )

        return Response(serialize(om), status=201)
