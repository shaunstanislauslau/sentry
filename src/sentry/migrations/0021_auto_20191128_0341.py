# -*- coding: utf-8 -*-
# Generated by Django 1.9.13 on 2019-11-28 03:41
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    is_dangerous = False


    dependencies = [
        ('sentry', '0020_auto_20191125_1420'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='LatestRelease',
            new_name='LatestRepoReleaseEnvironment',
        ),

        # SQL: ALTER TABLE "sentry_latestrelease" RENAME TO "sentry_latestreporeleaseenvironment";
        migrations.AlterModelTable(
            name='latestreporeleaseenvironment',
            table='sentry_latestreporeleaseenvironment',
        ),
    ]
