# -*- coding: utf-8 -*-
from django.conf.urls.defaults import *
from views import *
import os

urlpatterns = patterns('',
    url(r'^jumploader_z.jar$',      'django.views.static.serve',    name='jumploader_applet',       kwargs={'document_root': os.path.join(os.getcwd(),'jumploader/media'), 'path': 'jumploader_z.jar'}),
    url(r'^uploaded/(?P<path>.*)$', 'django.views.static.serve',    {'document_root': '/tmp/jumploader/'}),
    url(r'^load/$',                 applet_page,                    name='jumploader_applet_page'),
    url(r'^list/$',                 get_uploaded_files_list,        name='jumploader_uploaded_files'),
    url(r'^upload/$',               upload_handler,                 name='jumploader_upload_handler'),
)