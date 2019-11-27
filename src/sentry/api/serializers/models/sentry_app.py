from __future__ import absolute_import

from sentry.app import env
from sentry.auth.superuser import is_active_superuser
from sentry.api.serializers import Serializer, register
from sentry.models import SentryApp
from sentry.models.sentryapp import MASKED_VALUE


@register(SentryApp)
class SentryAppSerializer(Serializer):
    def serialize(self, obj, attrs, user, access):
        from sentry.mediators.service_hooks.creator import consolidate_events

        data = {
            "name": obj.name,
            "slug": obj.slug,
            "author": obj.author,
            "datePublished": obj.date_published,
            "scopes": obj.get_scopes(),
            "events": consolidate_events(obj.events),
            "status": obj.get_status_display(),
            "schema": obj.schema,
            "uuid": obj.uuid,
            "webhookUrl": obj.webhook_url,
            "redirectUrl": obj.redirect_url,
            "isAlertable": obj.is_alertable,
            "verifyInstall": obj.verify_install,
            "overview": obj.overview,
            "allowedOrigins": obj.application.get_allowed_origins(),
        }

        if is_active_superuser(env.request) or (
            hasattr(user, "get_orgs") and obj.owner in user.get_orgs()
        ):
            client_secret = (
                obj.application.client_secret if obj.show_auth_info(access) else MASKED_VALUE
            )
            data.update(
                {
                    "clientId": obj.application.client_id,
                    "clientSecret": client_secret,
                    "owner": {"id": obj.owner.id, "slug": obj.owner.slug},
                }
            )

        return data
