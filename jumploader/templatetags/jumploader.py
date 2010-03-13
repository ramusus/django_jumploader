# -*- coding: utf-8 -*-
from django import template
from django.conf import settings

register = template.Library()

@register.inclusion_tag('jumploader/applet.html')
def jumploader_applet():
    return {
        'partition_length': getattr(settings, 'JUMPLOADER_PARTITION_LENGTH')
    }