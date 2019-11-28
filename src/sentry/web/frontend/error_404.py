from __future__ import absolute_import

from django.views.generic import View
from django.template import loader
from django.http import HttpResponseNotFound


class Error404View(View):
    def dispatch(self, request):
        t = loader.get_template("sentry/404.html")
        # so previously it didn't seem to mind Context, but i believe this is discouraged, nede to confirm for PR description
        return HttpResponseNotFound(t.render(request=request))
