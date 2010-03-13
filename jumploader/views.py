from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from django.conf import settings
from types import FunctionType
import os
from os.path import join, getsize, isfile, exists

try:
    JUMPLOADER_UPLOAD_PATH = settings.JUMPLOADER_UPLOAD_PATH
    JUMPLOADER_STAGE_PATH = settings.JUMPLOADER_STAGE_PATH
    JUMPLOADER_PARTITION_LENGTH = settings.JUMPLOADER_PARTITION_LENGTH
except:
    raise ImportError('You must specified settings parameters JUMPLOADER_UPLOAD_PATH, JUMPLOADER_STAGE_PATH and JUMPLOADER_PARTITION_LENGTH in settings.py file')

def applet_page(request):
    return render_to_response('jumploader/load_page.html', {}, context_instance = RequestContext(request))

def get_uploaded_files_list(request):

    def get_abs(filename):
        return join(JUMPLOADER_UPLOAD_PATH, filename)

    def get_link(filename):
        return '/jumploader/uploaded/%s' % filename

    #Get list of files in upload directory
    files = [filename for filename in os.listdir(JUMPLOADER_UPLOAD_PATH) if isfile(get_abs(filename))]

    #Sort by time of most recent content modification
    files.sort(cmp=lambda y,x: int(os.stat(get_abs(x)).st_mtime - os.stat(get_abs(y)).st_mtime))

    listing = '<ul>%s</ul>' % ''.join(['<li><a href="%s">%s</a> <em>(%d bytes)</em></li>' % (get_link(file), file, getsize(get_abs(file))) for file in files]) if len(files) else ''

    return HttpResponse(listing)

def upload_handler(request, callbackFunction=None):
    '''
    Retrieve request parameters
    '''
    file_name = request.POST.get('fileName')
    file_id = request.POST.get('fileId')
    partition_index = request.POST.get('partitionIndex')
    partition_count = request.POST.get('partitionCount')
    file_length = request.POST.get('fileLength')

    try:
        partition_index = int(partition_index)
        partition_count = int(partition_count)
    except:
        raise TypeError('Error of request parameters: "partitionCount" and "partitionIndex" must have number value')

    '''
    The client_id is an essential variable,
    this is used to generate uploaded partitions file prefix,
    because we can not rely on 'fileId' uniqueness in a
    concurrent environment - 2 different clients (applets)
    may submit duplicate fileId. thus, this is responsibility
    of a server to distribute unique clientId values
    (or other variable, for example this could be session id)
    for instantiated applets.
    '''
    client_id = request.session._session_key or ''

    #Create directory for partition files if it not exsits
    if not exists(JUMPLOADER_STAGE_PATH):
        os.makedirs(JUMPLOADER_STAGE_PATH)
    if not exists(JUMPLOADER_UPLOAD_PATH):
        os.makedirs(JUMPLOADER_UPLOAD_PATH)

    #Check if not last partition have lengh less than JUMPLOADER_PARTITION_LENGTH
    if partition_index < partition_count-1:
        try:
            assert request.FILES['file']._size == JUMPLOADER_PARTITION_LENGTH
        except:
            raise ValueError('Partition\'s length validation error')

    #Move uploaded partition to the staging folder using following name pattern: JUMPLOADER_STAGE_PATH / clientId . fileId . partitionIndex
    partition_file = join(JUMPLOADER_STAGE_PATH, '.'.join([client_id, file_id, str(partition_index)]))
    partition_file_handle = open(partition_file, 'wb+')
    for chunk in request.FILES['file'].chunks():
        partition_file_handle.write(chunk)
    partition_file_handle.close()

    #Check if we have collected all partitions properly
    all_in_place = True
    partitions_length = 0
    for count in range(0, partition_count):
        if all_in_place:
            partition_file = join(JUMPLOADER_STAGE_PATH, '.'.join([client_id, file_id, str(count)]))
            if isfile(partition_file):
                partitions_length += getsize(partition_file)
            else:
                all_in_place = False

    if partition_index == partition_count-1:
        #Issue error if last partition uploaded, but partitions validation failed
        try:
            assert all_in_place
            assert partitions_length == int(file_length)
        except:
            raise IOError('Upload validation error')

        #Reconstruct original file if all ok
        file = join(JUMPLOADER_UPLOAD_PATH, '.'.join([client_id, file_id]))
        file_handle = open(file, 'wb+')
        for count in range(0, partition_count):
            #Read partition file
            partition_file = join(JUMPLOADER_STAGE_PATH, '.'.join([client_id, file_id, str(count)]))
            partition_file_handle = open(partition_file, 'rb')
            contents = partition_file_handle.read()
            partition_file_handle.close()
            #Write to reconstruct file
            file_handle.write(contents)
            #Remove partition file
            os.unlink(partition_file)
        file_handle.close()

        #Rename to original file
        #NB! This may overwrite existing file
        result_filename = join(JUMPLOADER_UPLOAD_PATH, file_name)
        os.rename(file, result_filename)
        #Call user's callback function for optional actions with uploaded file
        if callbackFunction and isinstance(callbackFunction, FunctionType):
            callbackFunction(result_filename)

    return HttpResponse('success')