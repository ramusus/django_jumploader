/**
 * Lib jljs
 * http://code.google.com/p/jljs/
 * @type
 */
JL = {
    'applet' : function () {return document.jumpLoaderApplet},
    /*returns Jumploader version number as splitted array, e.g. "JumpLoader v2.10.3" => [2, 10, 3] */
    'version': function() {
        var version_arr = JL.applet().getAppletInfo().split(' ')[1].substr(1).split('.');
        for (var i=0;i < version_arr.length; i++){
            version_arr[i] = parseInt(version_arr[i]);
        }
        return version_arr;
     },
    'getUploader' : function () {
        return this.applet().getUploader();
     },
    '_init': function () {},
    //also fire an onready event after applet is initialized
    '_onload': function (applet) {
                    this._init();
                    this.onready(JL.getUploader());
                    this.onload(applet);
                },
    'onload': function (applet) {},
    'onstatuschanged': function (uploader) {},
    'onupload': function (uploader, file) {},
    'onready': function (uploader) {},
    'onreset': function (uploader) {},
    //view interface
    'view' : {
        'SHOW_CONTROL': true,
        'HIDE_CONTROL': false,
        'TOGGLE_CONTROL': -1,
        '_controls' : {
            UploadView : ['MenuBar','AddAction','RemoveAction','RetryAction','StartAction','StopAction','ListStatus','ProgressPane','FilesSummaryBar'],
            MainView  : ['FileTreeView', 'FileListView' ],
            FileTreeView : ['ShowFiles', 'ShowFileLength' ]
        },

        '_set_state' : function (control, value) {
            //here we set the state of the ui component and retrieve it from the controls object above.
            // setstate will automatically refresh the corresponding view.
            var view = this._get_view(control);
            var method_suffix;
            JL.util.starts_with(control,"Show")? method_suffix = '': method_suffix = 'Visible';
            var set_method = 'set' + view + control + method_suffix;
            var view_method = 'get' + view;
            this.get_config()[set_method](value);
            if (view === "MainView"){
                this.get_main_view()['updateView']()
            }
            else {
                this.get_main_view()[view_method]()['updateView']();
            }
        },
        '_get_view': function (control){
         //find the view a control belongs to
            var view = false;
            for (view in JL.view._controls){
                    if (JL.util.in_array (control, JL.view._controls[view])){
                        return view
                    }
                }
           // return view;
        },
         '_get_state' : function (control) {
           //fetches the state of the given control element - needed for toggling contols.
           var view =  this._get_view(control);
           var method_suffix;
           JL.util.starts_with(control,"Show")? method_suffix = '': method_suffix = 'Visible';
           //pattern of get Method: is + name of view + name of control + Visible,
           //e.g. isUploadViewRemoveActionVisible()
           var get_method = "is" + view + control + method_suffix;
           return this.get_config()[get_method]()
        },

        '_multi_setter': function (controls, value){
        //sets the states of one or multiple controls
            if (typeof(controls) == "object"){
                for (ctrl_num in controls){
                    var control = controls[ctrl_num];
                    value === this.TOGGLE_CONTROL? this._set_state(control, !this._get_state(control)):this._set_state(control, value);
                  }
            }
            else {
                 value === this.TOGGLE_CONTROL? this._set_state(controls, !this._get_state(controls)):this._set_state(controls, value);
            }
        },

        'get_config' : function () {
            return JL.applet().getViewConfig();
        },
         'get_main_view' : function () {
            return JL.applet().getMainView();
        },
         'show' : function (controls) {
            this._multi_setter (controls, this.SHOW_CONTROL);
        },
         'hide' : function (controls) {
           this._multi_setter (controls, this.HIDE_CONTROL);

        },
         'toggle' : function (controls) {
           this._multi_setter (controls, this.TOGGLE_CONTROL);
        }
    },
    //actions can be assigned to buttons
    'actions': {
        start_upload: function () {
                        var start_upload = JL.upload.onstart();
                        if (start_upload === false){
                            return false;
                        }
                        var error = JL.getUploader().startUpload();
                        if( error != null ) {
                            JL.upload.onerror(error);
                        }
                    },
        stop_upload: function (){
                        JL.upload.onstop(index);
                        var error = JL.getUploader().stopUpload();
                        if( error != null ) {
                            JL.upload.onerror(error);
                        }
            },
        //remove all files from jumploader
        remove_files: function (){
            filenum = JL.upload.files();
            for (var i=0;i < filenum; i++){
                JL.getUploader().removeFileAt(i);
            }
        },
        //remove selected files from jumploader
        remove_selected: function (){},
        //reload the applet (but not containing page?)
        reload_applet: function (options) {}
        },
    //upload interface
    'upload': {
        //event handlers
        'onstart': function () {},
        'onstop': function () {},
        'onerror': function (error) {},
        //these parameters have getter methods starting with 'is'
        '_is_params' : ['directoriesEnabled', 'duplicateFileEnabled', 'imageEditorEnabled', 'preserveRelativePath', 'sendExif',
                        'sendFileLastModified', 'sendFilePath', 'sendIptc', 'stretchImages', 'zipDirectoriesOnAdd', 'uploadOriginalImage',
                        'uploadQueueReorderingAllowed', 'uploadScaledImages', 'uploadScaledImagesNoZip', 'urlEncodeParameters',
                        'useMainFile', 'useMd5', 'usePartitionMd5'].join(""),
        //abbreviation functions
        '_set_param': function (key, value){
            set_method =  'set' + key.substr(0,1).toUpperCase() + key.substr(1);
            this.get_config()[set_method](value);
        },
        /*(re) enable upload*/
        'enable': function (){
            JL.getUploader().setUploadEnabled(true);
        },
        /*disable upload*/
        'disable': function (){
            JL.getUploader().setUploadEnabled(false);
        },
        'is_enabled': function(){
            return JL.getUploader().isUploadEnabled();
        },
        '_get_param': function (key, value){
            var get_prefix = 'get';
            if (this._is_params.indexOf(key) > -1){
                get_prefix = 'is';
             }
            get_method =  get_prefix + key.substr(0,1).toUpperCase() + key.substr(1);
            return this.get_config()[get_method]();
        },
         'add': function (filepaths){
             /*filepaths can be:
                - a string identifying one file or directory
                - an array holding multiple files or directories
            */
            if (typeof(filepaths) === "string"){
                filepaths = [filepaths];
            }
            for (num in filepaths){
                JL.getUploader().addFile(filepaths[num]);
                }
         },
       'files': function(findex) {
            /*when invoked without parameter, returns the file count
                                 when invoked with index parameter (number), returns the corresponding file
                                 when invoked with a string id, tries to retrieve the file by id
                             */
            if (findex === undefined) {
                return JL.getUploader().getFileCount();
            } else if (typeof(findex) === "number") {
                return JL.getUploader().getFile(findex);
            } //iterate through the files and retrieve them by id
            else if (typeof(findex) === "string") {
                var filelist = JL.getUploader().getAllFiles();
                for (var i = 0; i < filelist.length; i++) {
                    if (filelist[i].getId() === findex) {
                        return filelist[i];
                    }
                }
            }
            return null;
        },
        'params': function (key, val){
        /*user submits upload configuration parameters like scaledInstanceDimensions,...
              defined here: http://jumploader.com/api/jmaster/jumploader/model/api/config/UploaderConfig.html
        */
            //key is either a dictionary or a parameter to look up
            if (val === undefined){
                //set or get multiple params at once
                if (typeof(key) == "object"){
                    //key is an array with multiple params - we return their values in an array
                    if (typeof(key.join) == "function"){
                        var valarr = [];
                        for (param in key){
                            valarr.push(this._get_param (key[param]));
                        }
                        return valarr
                    }
                    //key is an object with multiple key/value pairs - we set their values
                    for (param in key){
                        this._set_param (param, key[param]);
                        }
                }
                //get the value of a param
                else {
                   return this._get_param (key);
                }
            }
            //key,value pair to set a parameter
            else {
                this._set_param(key, val);
            }

        },
        'get_config' : function (){
            return JL.applet().getUploaderConfig();
         },
        '_get_attr_set': function () {
            var uploader = JL.getUploader();
            var attr_set = uploader.getAttributeSet();
            return attr_set;
        },
        'set_attr': function (key, value){
            var attr_set = this._get_attr_set();
            var attr = attr_set.createStringAttribute(key, value);
            attr.setSendToServer(true);
         },
        'get_attr': function (key) {
            var attr_set = this._get_attr_set();
            return      attr_set.getAttributeByName(key);
        }
    },
    'file': {
            //event handlers
            'onstatuschanged': function (uploader, file) {},
            'onadd': function (uploader, file) {},
            'onremove': function (uploader, file) {},
            //filetypes
            'types': {
                'image': ['jpeg', 'jpe', 'jpg', 'gif', 'png'],
                'source': ['js','py','php','c','rb','as', 'asp','pas','bat','sh','txt','html','htm'],
                'video': ['avi','mov','flv','mpg','wmv','vob','3gp','vp3'],
                'audio': ['wav','ogg','mp3','wma','aiff','au','ra'],
                'documents': ['doc','docx','sxw','odt','txt', 'pdf','xls','xlsx', 'csv', 'ods', 'sxc', 'ppt','pptx','odp', 'sxi','pdf']
            },
            'get_ratio': function (file){
                var ext = this.get_extension(file);
                if (ext === undefined){
                    return 0.66;
                }
                if (JL.util.in_array(ext,['jpg','jpe','jpeg']) ||JL.util.in_array(ext,this.types.video)){
                    return 0.05;
                }
                if (JL.util.in_array(ext,this.types.source)){
                    return 0.85;
                }
                return 0.66;

            },
            //enhancement functions - tbd
            'get_extension': function (file) {
                var fname = file.getName();
                var ext = fname.split('.');
                if (ext.length === 1){
                    return undefined;
                }
                else {
                    return ext[ext.length -1].toLowerCase();
                }
            },
            'get_info': function (file) {
                //TODO: distinguish between files and directories safely
                /*if (file.isFile() == false){
                    return {}
                }*/

                return {'filename': file.getName(),
                        'path': file.getPath(),
                        'extension': this.get_extension(file),
                        'length': file.getLength(),
                        'kind': undefined
                        }
             },
            'set_attr': function (file, name, value){
                var attrSet = file.getAttributeSet();
                var attr = attrSet.createStringAttribute( name, value );
                attr.setSendToServer(true);
             },

             'get_attr': function (file, name){
                var attrSet = file.getAttributeSet();
                return  attrSet.getAttributeByName(name);
             },

            '_is_filetype': function (file, extarr) {
                if (JL.util.in_array (JL.file.get_extension(file), JL.file.types[extarr])){
                    return true;
                }
                return false;
            },
            'is_image': function (file) {return _is_filetype(file,'image') },
            'is_document': function (file) {return _is_filetype(file,'documents')},
            'is_video': function (file) {return _is_filetype(file,'video')},
            'is_sourcecode': function (file) {return _is_filetype(file,'source')},
            'get_filetype': function (file) {},
            'estimate_upload_size': function (file) {
                //no image scaling or zipped upload --> return actual filesize
                if (JL.upload.params(['zipDirectoriesOnAdd','uploadScaledImages']) === [false, false]){
                    return file.getLength();
                }
                //zip compression is on --> estimate compression ratio
                if (JL.upload.params('zipDirectoriesOnAdd') === true){
                    //calculate size by using estimated compression ratio
                    return file.getLength()*(1- JL.file.get_ratio(file));
                }
                //uploadScaledImages --> estimate filesize of generated JPEGs
                if (JL.upload.params('uploadScaledImages') === true && JL.file.is_image(file) === true){
                   var inst_dims = JL.upload.params('scaledInstanceDimensions').split(',');
                   var inst_qual = JL.upload.params('scaledInstanceQualityFactors').split(',');
                   var est_size = 0;
                   var dim_x, dim_y, qual;
                   for (num in inst_dims) {
                      [dim_x,dim_y] = inst_dims[num].split('x');
                      qual = inst_qual[num];
                      //very simple formula for estimating compressed JPEG filesize
                      //take 75% of the scaled InstanceDimensions area and multiply with a quality setting to the square
                      est_size += parseInt(dim_x)*parseInt(dim_y)*0.75*Math.pow(parseInt(qual)/1000,2);
                    }
                  return Math.round(est_size);
                }
            }
         },
    //utility functions
    'util' : {
        'ebid': function (eid){return document.getElementById(eid);},
        'ebtn': function (tn) {return document.getElementByTagName(tn);},
        'starts_with': function (haystack, needle){
            return (haystack.match("^"+needle)==needle)
        },
        'in_array': function (item, arr){
            if (arr.join(',').indexOf(item) > -1){
                return true;
            }
            return false;
        }
    }
}