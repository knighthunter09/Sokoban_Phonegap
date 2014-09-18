// Start******* Application Initialization ***********
var db;
var pictureSource; // picture source
var destinationType; // sets the format of returned value
var defaultSMSNumber = 91084383;//90845806; //Wei 96838072; // Hard coded by default
var defaultSMSMessage = "This is the tracking message."
var states = {};
var connectedToInternet = false;
var lastUpdatedTimeStamp = "";
var isPendingMsgCleared = false;

var app = {
    initialize: function () {
        this.bindEvents();
    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("online", this.appOnline, false);
        document.addEventListener("offline", this.appOffline, false);
    },
    onDeviceReady: function () {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {
        updateNetworkConnection();
        db = window.openDatabase("ACNMobileDB", "1.0", "ACN Track Mobile Database", 10000000);
        if(!window.localStorage.getItem("acnFirstRun")) {
        	db.transaction(populateDB, transactionError, transactionSuccessful);
        	//New: For two way messaging feature
            db.transaction(createInboxDB, transactionError, transactionSuccessful);
            
        	window.localStorage.setItem("acnFirstRun", "true");
        }
		Default_WS_IPaddress = window.localStorage.getItem("WS_IPaddress") ? window.localStorage.getItem("WS_IPaddress") : "SSIPODEV23.SSIPODEV.COM";
		WS_IPaddress = window.localStorage.getItem("WS_IPaddress") ? window.localStorage.getItem("WS_IPaddress") : "SSIPODEV23.SSIPODEV.COM";
		
        pictureSource = navigator.camera.PictureSourceType;
        destinationType = navigator.camera.DestinationType;
        
        reportCategory = "Reporting";
        		
		//New: For two way messaging feature
        //db.transaction(queryInboxMsgTable);
        db.transaction(deleteAllDatafromInboxMsgTable);
        lastUpdatedTimeStamp = "";
        isPendingMsgCleared = false;
    },
    appOnline: function() {
    	connectedToInternet = true;
    	updateNetworkConnection();
    	if (connectedToInternet) {
    		updateDeviceId();
    	}
    },
    appOffline: function() {
    	connectedToInternet = false;
    	$("#home_network_button").html("<strong>No Internet Connection</strong>");
    	if (!connectedToInternet) {
    		updateDeviceId();
    	}
    	
    }  
};


// End******* Application Initialization ***********

// Start******* CODE FOR THE DATABASE ***********

// Create & Populate the database
function populateDB(tx) {
    tx.executeSql('DROP TABLE IF EXISTS TBL_MobileMsg');
    tx.executeSql('CREATE TABLE IF NOT EXISTS TBL_MobileMsg (ID_MobileMsg INTEGER PRIMARY KEY AUTOINCREMENT, ID_Device varchar(30), GPS_Long varchar(30), GPS_Lat varchar(30), DateTimeRec varchar(30), MText varchar(250), MCategory varchar(250), CamImage longblob)');

    tx.executeSql('DROP TABLE IF EXISTS TBL_LastGPS');
    tx.executeSql('CREATE TABLE IF NOT EXISTS TBL_LastGPS (GPS_Long varchar(30), GPS_Lat varchar(30))');
    tx.executeSql('INSERT INTO TBL_LastGPS (GPS_Long, GPS_Lat) VALUES (?,?)', ["103.854207", "1.294410"]); //Default values for CITY HALL MRT
}

//New: For two way messaging feature
function createInboxDB(tx) {
	tx.executeSql('CREATE TABLE IF NOT EXISTS TBL_Inbox (ID_MobileMsg INTEGER PRIMARY KEY AUTOINCREMENT, Msg_Title varchar(50), Msg_Body varchar(200), Msg_Category varchar(100), DateTimeRec varchar(30), Officer_By varchar(100))');
}

//New: For two way messaging feature
function populateInboxDB(tx, msgTitle, msgBody, msgCategory, msgDateTime, msgSender) {
	tx.executeSql('INSERT INTO TBL_Inbox (Msg_Title, Msg_Body, Msg_Category, DateTimeRec, Officer_By) VALUES ( ?,?,?,?,?)', [msgTitle, msgBody, msgCategory, msgDateTime, msgSender]);
}

//New: For two way messaging feature
function queryInboxMsgTable(tx) {
    tx.executeSql('SELECT * FROM TBL_Inbox ORDER BY DateTimeRec DESC', [], loadMessageSuccess, transactionError);
}

function refreshUpdateGPSTable(tx) {
    tx.executeSql('DELETE FROM TBL_LastGPS');
    tx.executeSql('INSERT INTO TBL_LastGPS (GPS_Long, GPS_Lat) VALUES (?,?)', [longi, lati]);
}

// Query the database
function queryMobileMsgTable(tx) {
    tx.executeSql('SELECT * FROM TBL_MobileMsg', [], querySuccess, transactionError);
}

// Query the database
function queryUpdateMsgWithGPSData(tx) {
    tx.executeSql('SELECT * FROM TBL_LastGPS', [], querySuccessRetGPS, transactionError);
}


// Query for deleting all data from database
function deleteAllDatafromMsgTable(tx) {
    tx.executeSql('DELETE FROM TBL_MobileMsg');
}

function deleteDatafromMsgTable(tx) {
    tx.executeSql('DELETE FROM TBL_MobileMsg where DateTimeRec = ' + '"' + refId + '"');
}

//New: For two way messaging feature
function deleteAllDatafromInboxMsgTable(tx) {
    tx.executeSql('DELETE FROM TBL_Inbox');
}

// Query for Add track message to database
function updateMsgDB(tx) {
    tx.executeSql('INSERT INTO TBL_MobileMsg (ID_Device, GPS_Long, GPS_Lat, DateTimeRec, MText, MCategory, CamImage) VALUES ( ?,?,?,?,?,?,?)', [device_id, longi, lati, tstmp, textdetail, reportCategory, imguri]);
    clearLocalVarData();
}


// End ******* CODE FOR THE DATABASE ***********


// Start ******* TX Logs ***********
function transactionSuccessful() {
    //alert("DB Operation Successful!! ");
}

// Transaction error callback
function transactionError(err) {
    if (err) {
    	$("<li style=\"padding-left:15px;color:#000000;\"><p><b>" + "Message could not be sent on:</b><br>"   
                    + getFormattedTimeStamp(getTimeStamp()) + "<br><b>Co-ordinate:</b><br>Latitude: " 
                    + (lati ? lati : "NA") + "<br>Longitude: " + (longi ? longi : "NA") + "<br><span style=\"color:red\">" 
                    + (err.message ? err.message : err) + "</span></p></li>").prependTo($("#startTracking_info"));
    }	
}

//transaction success when deleting
function deleteSuccess() {
    //alert("The Data on the Database has been successfully deleted!");
}
// End ******* TX Logs ***********


// Start ********** CODE FOR THE HOME PAGE ***************

function updateDeviceId() {
            	        
        //Device related information
        if (device.uuid && !window.localStorage.getItem("acnSavedUser")) {
        	$("#device_id").attr("placeholder",device.uuid);
        	//Un-comment when requirement changes again
       		device_id = device.uuid;
        } else {
        	$("#device_id").attr("placeholder",window.localStorage.getItem("acnSavedUser"));
        	//Un-comment when requirement changes again
       		device_id = window.localStorage.getItem("acnSavedUser");
        }
        window.localStorage.getItem("WS_IPaddress") ? $("#ipAddress_WS").attr("placeholder",window.localStorage.getItem("WS_IPaddress")) : $("#ipAddress_WS").attr("placeholder","Please set IP address for the desired Web Service");
    }  
    
//check cell connection
function updateNetworkConnection() {
    states[Connection.UNKNOWN] = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI] = 'WiFi connection';
    states[Connection.CELL_2G] = 'Cell 2G connection';
    states[Connection.CELL_3G] = 'Cell 3G connection';
    states[Connection.CELL_4G] = 'Cell 4G connection';
    states[Connection.CELL] = 'Cell generic connection';
    states[Connection.NONE] = 'No network connection';
    var networkState = navigator.connection.type;
    $("#home_network_button").html("<strong>" + states[networkState] + "</strong>");
}

//code to delete all the data on the table
$(document).on('click', '#home_clearstorage_button', function () {
    db.transaction(deleteAllDatafromMsgTable, transactionError, deleteSuccess);
});

// End ********** CODE FOR THE HOME PAGE ***************


// START ************* CODE FOR THE TRACKING PAGE **************

//Specified Watch ID & necessary attribute
var myinterval = null;
var tstmp_array = [];

//Specified universal variable for the whole Application
var device_id = 1.0 || device.uuid; // is set to 1 by default
var longi = null;
var lati = null;
var tstmp = null;
var imguri = null;
var textdetail = null;
var reportCategory = "Reporting";
var WS_IPaddress = "SSIPODEV23.SSIPODEV.COM";
var Default_WS_IPaddress = "SSIPODEV23.SSIPODEV.COM";

var refId;

//New: For two way messaging feature
function loadMessageSuccess(tx, results) {
	$("#broadCastMsg").empty();
    var len = results.rows.length;
    for (var i = 0; i < len; i++) {
        //populate data
		populateBroadcastMessage(results.rows.item(i).Msg_Title, results.rows.item(i).Msg_Body, results.rows.item(i).Msg_Category, results.rows.item(i).DateTimeRec, results.rows.item(i).Officer_By);	
    }
}


//event handler when the start tracking button is clicked
$(document).on('click', '#startTracking_start', function () {
    strtTracking();
});

function strtTracking() {
    $('#startTracking_start').addClass('ui-disabled');
    $('#startTracking_stop').removeClass('ui-disabled');

    var element = document.getElementById('startTracking_status');
    element.innerHTML = "Tracking Status: <strong>Enabled</strong>";

    var element1 = document.getElementById('startTracking_info');
    element1.innerHTML = "";

    //State the options
    var options = {
        maximumAge: 0,
        timeout: 30000,
        enableHighAccuracy: true
    };

    myinterval = setInterval(function () {
        //Get the location
        navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }, 30000);
}

// onSuccess from when GEO Location finally retrieved their coordinates
function onSuccess(position) {
    longi = position.coords.longitude;
    lati = position.coords.latitude;
    tstmp = getTimeStamp();

    db.transaction(refreshUpdateGPSTable, transactionSuccessful, transactionError);
    
    setTimeout(function() {
    	if (connectedToInternet || states[navigator.connection.type] == 'WiFi connection' || states[navigator.connection.type] == 'Cell 2G connection' 
				|| states[navigator.connection.type] == 'Cell 3G connection' || states[navigator.connection.type] == 'Cell 4G connection') {
			    	sendTrackingMessageWithLastUpdatedMsgTime(sendTrackingMessage);
		} else {
				sendSMS("id: " + device_id + ", longitude: " + (longi ? longi : "NA") + ", latitude: " + (lati ? lati : "NA") + ", timestamp: " 
					+ getFormattedTimeStamp(tstmp));
		}
	}, 15000);	
}

// onError Callback receives a PositionError object
function onError(error) {
    if (!isPendingMsgCleared) {
    	isPendingMsgCleared = true;
        sendPendingMessages();                	
    }
    transactionError(error);
}

function sendTrackingMessage(lastUpdatedMsgTime) {
    var track_data = {}; // to clear the data
    track_data.id = device_id || device.uuid;
    track_data.text = null;
    track_data.gpsLatitude = lati;
    track_data.gpsLongitude = longi;
    track_data.timestamp = getFormattedTimeStamp(getTimeStamp());
    track_data.img = null;
    track_data.cat = reportCategory;
    track_data.lastupdated = lastUpdatedMsgTime;
    var json_text = JSON.stringify(track_data, null, 2);
    
    $.ajax(function () {
        var json_text_loc = json_text;
        var lati_loc =  track_data.gpsLatitude;
        var longi_loc = track_data.gpsLongitude;
        var tstmp_loc = track_data.timestamp;
        return {
            type: "POST",
            data: json_text_loc,
            dataType: "json",
            url: "http://" + WS_IPaddress + "/Ops.MBSC.Service/TrackingService.svc/ReceieveTrackData",
            contentType: "application/json; charset=utf-8",
            success: function (msg) {
                $("<li style=\"padding-left:15px;color:#000000;\"><p><b>" + "Tracking message sent on:</b><br>"   
                    + tstmp_loc + "<br><b>Co-ordinate:</b><br>Latitude: " 
                    + (lati_loc ? lati_loc : "NA") + "<br>Longitude: " + (longi_loc ? longi_loc : "NA") + "</p></li>").prependTo($("#startTracking_info"));  
                if (!isPendingMsgCleared) {
                   isPendingMsgCleared = true;
                   sendPendingMessages();                	
                }
                //New: For two way messaging feature
                //Iterate and populate
                var parsedVal = $.parseJSON(msg);
                //Parsing it twice, not correct but was not able to get to the JSON obj in one round of parsing.
                //Will come back to this problem later.
                parsedVal = $.parseJSON(parsedVal);
                if (parsedVal.length > 0) {
                	navigator.notification.beep(3);
                	lastUpdatedTimeStamp = parsedVal[0].DateReceived;
   				}  
				for (var i = parsedVal.length-1; i >= 0; i--) {
    				var msgTitle = parsedVal[i].MsgTitle;
    				var msgDesc = parsedVal[i].MsgDesc;
    				var msgCategory = parsedVal[i].MsgCategory;
    				var dateReceived = parsedVal[i].DateReceived;
    				var sender = parsedVal[i].Sender;
    				db.transaction((function (msgTitle, msgDesc, msgCategory, dateReceived, sender) {
        					return function (tx) {
            					populateInboxDB(tx, msgTitle, msgDesc, msgCategory, dateReceived, sender);
        					};
    					}(msgTitle, msgDesc, msgCategory, dateReceived, sender)),
    					transactionError, (function (msgTitle, msgDesc, msgCategory, dateReceived, sender) {
        				return function () {
            				populateBroadcastMessage(msgTitle, msgDesc, msgCategory, dateReceived, sender);
        				};
    				}(msgTitle, msgDesc, msgCategory, dateReceived, sender)));
				}
            },
            error: function (xhr, status, error) {
            	 	$("<li style=\"padding-left:15px;color:#000000;\"><p><b>" + "Service end point could not be reached, sending sms with available data:</b><br>"   
                    	+ (getFormattedTimeStamp(tstmp_loc) ? getFormattedTimeStamp(tstmp_loc) : "NA") + "<br><b>Co-ordinate:</b><br>Latitude: " 
                    	+ (lati_loc ? lati_loc : "NA") + "<br>Longitude: " + (longi_loc ? longi_loc : "NA") + "<br>Error: <span style=\"color:red\">" 
                    	+ error + "</span><br>Status: <span style=\"color:red\">" 
                    	+ status + "</span></p></li>").prependTo($("#startTracking_info"));
                    
                    sendSMS("id: " + device_id + ", longitude: " +  (longi_loc ? longi_loc : "NA") + ", latitude: " 
                    	+  (lati_loc ? lati_loc : "NA") + ", timestamp: " + (getFormattedTimeStamp(tstmp_loc) ? getFormattedTimeStamp(tstmp_loc) : "NA"));	            	 	
                   
            }
        }
    }());
}


function sendPendingMessages() {
    db.transaction(queryMobileMsgTable);
}


function deletePendingMessages(recordId, currentRec) {
    db.transaction(function (tx) {
        tx.executeSql('DELETE FROM TBL_MobileMsg where ID_MobileMsg = ' + '"' + recordId + '"');        
    },
    function(err){
    	if (isPendingMsgCleared) {
     		isPendingMsgCleared = false;
   	 	}
    }, function(){
    	if (!currentRec) {
            isPendingMsgCleared = false;
        }
    });
}

function querySuccessRetGPS(tx, results) {
    var len = results.rows.length;
    var longi_loc = "";
    var lati_loc = "";
    for (var i = 0; i < 1; i++) {
        //populate data  
        longi_loc = results.rows.item(i).GPS_Long;
        lati_loc = results.rows.item(i).GPS_Lat;
        tstmp = getTimeStamp();
        db.transaction(function (tx) {
            tx.executeSql('UPDATE TBL_MobileMsg SET GPS_Long = ' + '"' + longi_loc + '"' + ', GPS_Lat = ' + '"' + lati_loc + '"');
        }, transactionError, transactionSuccessful);
    }
}

// Transaction Success Callback for when the querydb is success
function querySuccess(tx, results) {
    var track_data = {}; // to clear the data
    var len = results.rows.length;
    var json_text;
    if (!len) {
      isPendingMsgCleared = false;
   	}
    for (var i = 0; i < len; i++) {
        //populate data  
        track_data.id = results.rows.item(i).ID_Device;
        track_data.text = results.rows.item(i).MText;
        track_data.gpsLatitude = results.rows.item(i).GPS_Lat;
        track_data.gpsLongitude = results.rows.item(i).GPS_Long;
        track_data.timestamp = getFormattedTimeStamp(results.rows.item(i).DateTimeRec);
        track_data.img = results.rows.item(i).CamImage;
        track_data.cat = results.rows.item(i).MCategory;
        track_data.lastupdated = "";
        //convert data to json to be ready to be sent over the web service
        json_text = JSON.stringify(track_data, null, 2);
        //the code below is to sent the data to the web service
        $.ajax(function () {
            var recordId = results.rows.item(i).ID_MobileMsg;
            var json_text_loc = json_text;
            json_text = "";
            var lati_loc = track_data.gpsLatitude;
            var longi_loc = track_data.gpsLongitude;
            var tstmp_loc = track_data.timestamp;
            var currentRec = len - 1 - i;
            return {
                type: "POST",
                data: json_text_loc,
                dataType: "text",
                url: "http://" + WS_IPaddress + "/Ops.MBSC.Service/TrackingService.svc/ReceieveTrackData",
                contentType: "application/json; charset=utf-8",
                success: function (msg) {
                    deletePendingMessages(recordId, currentRec);
                    
                },
                error: function (xhr, status, error) {
                    $("<li style=\"padding-left:15px;color:#000000;\"><p><b>" + "Last report could not be submitted on:</b><br>"   
                    	+ tstmp_loc + "<br><b>Co-ordinate:</b><br>Latitude: " 
                    	+ lati_loc + "<br>Longitude: " + longi_loc + "<br>Error: <span style=\"color:red\">" 
                    	+ error + "</span><br>Status: <span style=\"color:red\">" 
                    	+ status + "</span></p></li>").prependTo($("#startTracking_info"));
                    return;
                }
            };
        }());
    }
}

//event handler when the stop tracking button is clicked
$(document).on('click', '#startTracking_stop', function () {
    if (myinterval != null) {
        var element1 = document.getElementById('startTracking_status');
        element1.innerHTML = "Tracking Status: <strong>Disabled</strong>";

        clearInterval(myinterval);
        myinterval = null;

        $('#startTracking_start').removeClass('ui-disabled');
        $(this).addClass('ui-disabled');	
    } else if (myinterval == null) {
    }
});

// END ************* CODE FOR THE TRACKING PAGE **************

//Start *********** CODE FOR  SETTINGS PAGE********


//Event handler for save device ID when save device id button is clicked
$(document).on('click', '#settings_saveDeviceID', function () {
    var tryid = $("#device_id").val();
    var element = document.getElementById('SettingsStatus_info');

    if (tryid.trim() == null || tryid.trim() == "") {
        alert("Please provide a valid input."); 		
        return;
    } else {
        device_id = tryid;
        window.localStorage.setItem("acnSavedUser", device_id);
        $("#device_id").attr("placeholder",window.localStorage.getItem("acnSavedUser"));
        element.innerHTML = "User ID is : <strong>" + device_id + "</strong>";
    }
});

//Event handler for save IP address for the web service
$(document).on('click', '#settings_saveipAddress', function () {
    var ipadd = $("#ipAddress_WS").val();
    var element = document.getElementById('SettingsStatus_info');
	element.innerHTML = "";
    if (ipadd.trim() == "") {
        $('#settings_saveipAddress').removeClass('ui-disabled');
        return;
    }

    $(this).addClass('ui-disabled');

    //the code below is to sent the data to the web service
    $.ajax({
        type: "POST",
        data: {},
        dataType: "text",
        url: "http://" + ipadd + "/Ops.MBSC.Service/TrackingService.svc/ServiceStatus",
        contentType: "application/json; charset=utf-8",
        success: function (msg) {
            var obj = jQuery.parseJSON(msg);
            //Uncomment later
            WS_IPaddress = ipadd || Default_WS_IPaddress;
            element.innerHTML = "The application is now connected to the web service at the provided IP Address : <strong>" + ipadd + "</strong>";
            window.localStorage.setItem("WS_IPaddress", WS_IPaddress);
            $('#settings_saveipAddress').removeClass('ui-disabled');
        },
        error: function (xhr, status, error) {
        alert("Error: " + error + ", Status: " + status);
            $('#settings_saveipAddress').removeClass('ui-disabled');
            return;
        }, timeout:30000
    });
});

//End *********** CODE FOR  SETTINGS PAGE********

//Start *****CODE ON SUBMIT EVENT PAGE***********

//The function to call to start the image capture process
function getPhoto(source) {
    navigator.camera.getPicture(onPhotoURISuccess, transactionError, {
        quality: 100,
        destinationType: destinationType.DATA_URL,
        sourceType: source,
        encodingType: 0,
        correctOrientation: true,
        saveToPhotoAlbum: true,
        targetWidth: 1600,
		targetHeight: 1600
    });
}

// Called when a photo is successfully retrieved
function onPhotoURISuccess(imageURI) {
    // Get image handle
    var largeImage = document.getElementById('dispIMG');

    // Unhide image elements
    largeImage.style.display = 'block';
    largeImage.width = 150;
    largeImage.height = 150;

    // Show the captured photo
    // The inline CSS rules are used to resize the image
    largeImage.src = "data:image/jpeg;base64," + imageURI;
    imguri = imageURI; //store in universal var
}

//Event handler for submit event button when it is clicked
$(document).on('click', '#submitEvent_subBtn', function () {
    var trytext = $("#inputTextArea").val();
    if (trytext.length > 200) {
        alert("Please provide small textual description.");
        return;
    }
    //to make sure there is image
    if (!trytext && !imguri) {
        navigator.notification.alert("Please input either description or captured image.", alertCallback);
        return;
    }

    //disable all button while retrieving coordinates from GPS
    $(this).addClass('ui-disabled');
    $('#getimg_subBtnCamera').addClass('ui-disabled');
    $('#getimg_subBtnAlbum').addClass('ui-disabled');

    textdetail = trytext; // store in universal var

    var options = {
        maximumAge: 0,
        timeout: 30000,
        enableHighAccuracy: true
    };
    navigator.geolocation.getCurrentPosition(onSuccesssx, onErrorx, options);
});


//its called when the GPS location has been fixed or success in retrieving GPS coordinates
function onSuccesssx(position) {
    longi = position.coords.longitude;
    lati = position.coords.latitude;
    tstmp = getTimeStamp();

    db.transaction(refreshUpdateGPSTable, transactionSuccessful, transactionError);
    db.transaction(updateMsgDB, transactionError, transactionSuccessful); //add the track data to database

    //Enabling the button once the adding event process is done
    $('#submitEvent_subBtn').removeClass('ui-disabled');
    $('#getimg_subBtnCamera').removeClass('ui-disabled');
    $('#getimg_subBtnAlbum').removeClass('ui-disabled');
    $("#inputTextArea").val('');
    $("#dispIMG").attr("src", "");
    var imageData = document.getElementById('dispIMG');
    imageData.width = 0;
    imageData.height = 0;
    
    $('option[value=Reporting]').prop('selected', 'selected');
    $("#report_category").selectmenu("refresh");
    
    document.location.href = '#startTracking';
    //strtTracking();
}

//its called when there are no GPS fixed
function onErrorx(error) {
	
	//New:06/01/2014
	db.transaction(updateMsgDB, transactionError, transactionSuccessful); //add the track data to database
	
    //Update table with old coordinates message
    db.transaction(queryUpdateMsgWithGPSData, transactionError, transactionSuccessful);

    //Enabling the button once the adding event process is done
    $('#submitEvent_subBtn').removeClass('ui-disabled');
    $('#getimg_subBtnCamera').removeClass('ui-disabled');
    $('#getimg_subBtnAlbum').removeClass('ui-disabled');

    $("#inputTextArea").val('');
    $("#dispIMG").attr("src", "");
    var imageData = document.getElementById('dispIMG');
    imageData.width = 0;
    imageData.height = 0;
    
    $('option[value=Reporting]').prop('selected', 'selected');
    $("#report_category").selectmenu("refresh");

    document.location.href = '#startTracking';
}


//End *****CODE ON SUBMIT EVENT PAGE***********


// Start ********** Utility functions ***********

//to clear the data
function clearLocalVarData() {
    longi = null;
    lati = null;
    tstmp = null;
    imguri = null;
    textdetail = null;
    reportCategory = "Reporting";
}

//get TimeStamp data in JavaScript Format
function getTimeStamp() {
    var str = "";

    var currentTime = new Date();
    var day = currentTime.getDate();
    var month = (currentTime.getMonth()) + 1;
    var year = currentTime.getFullYear();
    var hours = currentTime.getHours();
    var minutes = currentTime.getMinutes();
    var seconds = currentTime.getSeconds();

    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    str += day + " " + month + " " + year + "  " + hours + " " + minutes + " " + seconds;

    return str;
}

//format time stamp in readable format
function getFormattedTimeStamp(timeStamp) {
    var formattedVal = "";
    if (timeStamp) {
        timeStamp = timeStamp.trim();
        var timeArr = timeStamp.split(" ");
        for (var x in timeArr) {
        	if(!timeArr[x]) {
        		continue;
        	} else if (x < 2) {
                formattedVal = formattedVal + timeArr[x] + "/";
            } else if (x == 2) {
                formattedVal = formattedVal + timeArr[x] + " ";
            } else if (x > 2 && x < timeArr.length - 1) {
                formattedVal = formattedVal + timeArr[x] + ":";
            } else if (x == timeArr.length - 1) {
                formattedVal = formattedVal + timeArr[x] + " ";
            }
        }
    }
    return formattedVal;
}

function resetCaptureForm() {
	$("#inputTextArea").val('');
    $("#dispIMG").removeAttr('src').attr('src', '');
    $('#dispIMG').css('display', 'none');
    imguri = "";
    var imageData = document.getElementById('dispIMG');
    imageData.width = 0;
    imageData.height = 0;
    reportCategory = "Reporting";
    $('option[value=Reporting]').prop('selected', 'selected');
    $("#report_category").selectmenu("refresh");
}

function alertCallback() {
	//Perform necessary operations if required.
}

function updateSelectedValue() {
	 reportCategory = $("#report_category").val();
}

function sendSMS(compiledMessage) {
	 SmsPlugin.prototype.send(defaultSMSNumber, (compiledMessage ? compiledMessage : defaultSMSMessage), '',
	 	function () { 
		    $("<li style=\"padding-left:15px;color:#000000;\"><p><b>A SMS was sent with available data:</b> " +  + defaultSMSNumber + " : " 
		    	+ (compiledMessage ? compiledMessage : defaultSMSMessage) + "</p></li>").prependTo($("#startTracking_info"));  
		 },
		 function (e) {
		    $("<li style=\"padding-left:15px;color:#000000;\"><p><b>" + "Failed to send sms on:</b><br>"   
                    	+ getFormattedTimeStamp(tstmp) + "<br><b>Co-ordinate:</b><br>Latitude: " 
                    	+ (lati ? lati : "NA") + "<br>Longitude: " + (longi ? longi : "NA") + "<br>Error: <span style=\"color:red\">" 
                    	+ e.message + "</span></p></li>").prependTo($("#startTracking_info"));
		 }
	);     
}

//New: For two way messaging feature
function populateBroadcastMessage(msgTitle, msgBody, msgCategory, dateReceived, senderName) {
	$("<li style=\"padding-left:15px;border-width:thin;border-style:solid;color:#000000;\"><p><b>" + msgTitle +"</b><br>"+ msgBody + "<br>" 
					 + "<b>Category:</b>" + msgCategory + "<br><b>Sender:</b>" + senderName + "<br><b>Received:</b>" + dateReceived + "<br>Acknowledge: <span style=\"padding-left:10px;\"><input type=\"checkbox\"/></span></p></li>").prependTo($("#broadCastMsg"));
}

function sendTrackingMessageWithLastUpdatedMsgTime(callFunction) {
	callFunction(lastUpdatedTimeStamp);
	//TODO: This seems to be having some issue, the order of retrieval is not in descending order. For now just updating the last updated time.	
	//var lastUpdatedTimeStamp = "";
	//	db.transaction(function(tx){tx.executeSql('SELECT * FROM TBL_Inbox ORDER BY DateTimeRec DESC', [], function(tx, results) {
	//			alert("results of query length lastupdated time fetch " + results.rows.length);
	//    		if (results && results.rows.length > 0) {
	//    			for (var i = 0; i < results.rows.length; i++) {
	//        			alert("DISPLAYING UPDATED TIME " + results.rows.item(i).DateTimeRec);			
	//    			}
	//    			for (var i = 0; i < 1; i++) {
	//        			lastUpdatedTimeStamp = results.rows.item(i).DateTimeRec;			
	//    			}    			
	//    		}
	//    		callFunction(lastUpdatedTimeStamp);
	//		}, function (err){callFunction(lastUpdatedTimeStamp);});});
}
// End ************* Utility functions *************