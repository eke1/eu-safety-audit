function updateSyncCounts(){

	if(localStorage.getObject('employeeCache'))
		$("#employee_records_sync_count").text(Object.keys(localStorage.getObject('employeeCache')).length);
	else
		$("#employee_records_sync_count").text(0);

	if(localStorage.getObject('vendorCache'))
		$("#vendor_records_sync_count").text(Object.keys(localStorage.getObject('vendorCache')).length);
	else
		$("#vendor_records_sync_count").text(0);
	
	if(localStorage.getObject('workTasks'))
		$("#work_tasks_sync_count").text(Object.keys(localStorage.getObject('workTasks')).length);
	else
		$("#work_tasks_sync_count").text(0);
	
	if(localStorage.getObject('trendCodes'))
		$("#trend_codes_sync_count").text(localStorage.getObject('trendCodes')["TK%"].length);
	else
		$("#trend_codes_sync_count").text(0);

	$("#facility_departments_synced tbody").html("");
	for(i = 0; i < facilities.length; i++){
		facility = facilities[i];
		if(localStorage.getObject('facilityResults' + facility.code + 'EDepartmentResults'))
			departmentCount = localStorage.getObject('facilityResults' + facility.code + 'EDepartmentResults').length;
		else
			departmentCount = 0
		if(localStorage.getObject('facilityResults' + facility.code + 'CDepartmentResults'))
			departmentContractorCount = localStorage.getObject('facilityResults' + facility.code + 'CDepartmentResults').length;
		else
			departmentContractorCount = 0
		if(localStorage.getObject('facilityResults' + facility.code + 'OfficeResults'))
			officeCount = localStorage.getObject('facilityResults' + facility.code + 'OfficeResults').length;
		else
			officeCount = 0
		$("#facility_departments_synced tbody").append("<tr><td>" + facility.displayname + "</td><td>" + departmentCount + "</td><td>" + departmentContractorCount + "</td><td>" + officeCount + "</td></tr>");

	}
}

function clear_cached_data(){
	localStorage.setObject('employeeCache', null);
	localStorage.setObject('vendorCache', null);
	localStorage.setObject('trendCodes', null);

	for(i = 0; i < facilities.length; i++){
		facility = facilities[i];
		localStorage.setObject('facilityResults' + facility.code + 'DepartmentResults', null);
		localStorage.setObject('facilityResults' + facility.code + 'OfficeResults', null);
	}

	updateSyncCounts();	

}
function update_progress_bar(callback){
	$("#cache_update_status").css('width', (completedJobs / totalUpdateJobs)*100 + "%");
	$("#cache_update_status span").text((completedJobs / totalUpdateJobs)*100 + "% Complete")

	if(completedJobs == totalUpdateJobs){
		localStorage.setObject('employeeCache',existingCache);
		if(callback)
			callback();
	}
}


var officeQueue = $({});
var departmentQueue = $({});
var employeeQueue = $({});
var vendorQueue = $({});
var workTaskQueue = $({});
var trendCodesQueue = $({});

var existingCache = localStorage.getObject('employeeCache');
var existingWorkTaskCache = localStorage.getObject('workTasks');
var existingTrendCodesCache = localStorage.getObject('trendCodes');

var alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
var trendCodeCategories = [	"TK%" ];
var workTaskCategories = [
	"AISP",
	"BGE DSO/TSO",
	"C&M ComEd OH",
	"C&M ComEd UG",
	"C&M Overhead BGE",
	"C&M PECO Aerial",
	"C&M PECO UG",
	"C&M Underground BGE",
	"Common Tasks",
	"Contractors",
	"DSO",
	"Engineering",
	"Field and Meter Services",
	"Fleet",
	"Gas BGE",
	"Gas PECO",
	"Meter Reading",
	"OCC/TSO",
	"Performance Assessment group",
	"SSG",
	"SUPPLY",
	"Safety",
	"T&S",
	"Training",
	"Work Management"];

$.ajaxQueue = function( queueName, ajaxOpts ) {
    // Hold the original complete function.
    var oldComplete = ajaxOpts.complete;

    var queuedFunction = function( next ) {
        // Create a complete callback to fire the next event in the queue.
        ajaxOpts.complete = function() {
            // Fire the original complete if it was there.
            if ( oldComplete ) {
            	oldComplete.apply( this, arguments );
            }
            // Run the next query in the queue.
            next();
        };

        ajaxOpts.context[1].find('td.status').html("<span class='glyphicon glyphicon-refresh fa-spin'></span> Loading");
        // Run the query.
        $.ajax( ajaxOpts );
    }

   if(queueName == "department")
    	departmentQueue.queue(queuedFunction);
   else if(queueName == "office")
   		officeQueue.queue(queuedFunction);
 	else if(queueName == "employee")
   		employeeQueue.queue(queuedFunction);
   	else if(queueName == "vendor")
   		vendorQueue.queue(queuedFunction);
   	else if(queueName == "workTask")
   		workTaskQueue.queue(queuedFunction)
   	else if(queueName == "trendCodes")
   		trendCodesQueue.queue(queuedFunction)

};

function update_cached_data(callback){
	// $(".cache_buttons").slideUp();
	// $(".cache_progress").slideDown();
	if(!localStorage.oauthtoken){
		$('#quickLogin').modal('show');
		$('#quickLogin #quick_login_reason').text("You will need to login before submitting updating the cache.");
		return;
	}

	completedJobs = 0;
	totalUpdateJobs = facilities.length*3 + alphabet.length + trendCodeCategories.length;
	$("#active_requests tbody").html("");
	update_progress_bar(callback);

	var employeeContractor = ["Employee", "Contractor"];

	for(i = 0; i < facilities.length; i++){
		facility = facilities[i].code;

		for(k = 0; k < employeeContractor.length; k++){
			var localCode = employeeContractor[k].substring(0,1);

			// departmentRow = $("#active_requests tbody").append("<tr><th>Department Lookup " + facilities[i].displayname +"</td><td class='status'><span class='glyphicon glyphicon-refresh fa-spin'></span></td></tr>");
			var departmentContext = [facility, $("<tr><th>" + facilities[i].displayname + " " + employeeContractor[k] + " Department Lookup </td><td class='status'><span class='glyphicon glyphicon-calendar'></span> Queued</td></tr>"), localCode];
			departmentContext[1].appendTo("#active_requests tbody");

			$.ajaxQueue("department", {
				url: services.getSelectedL7Base() + "DepartmentLookupByType?query",
				type: 'POST',
				headers: {
					// "cache-control": "no-cache",
					"Authorization" : "Bearer "+localStorage.oauthtoken,
				},
				data: JSON.stringify({ "facility": facility, "contractor": localCode == "C"  }),
				contentType: "application/json; charset=utf-8",
				dataType: 'JSON',
				context: departmentContext,
				success: function(data){
					
					cleanedArray = [];
					for(var i = 0; i < data.d.length; i++){
						cleanedArray.push([data.d[i].Value, data.d[i].Name]);
					}
					
					var currentResults = localStorage.getItem('facilityResults' + this[0] + this[2] + 'DepartmentResults');
					var newResults = JSON.stringify(cleanedArray);

					if(currentResults !== newResults){
						console.log('Updated local storage!');
						localStorage.setObject('facilityResults' + this[0] + this[2] + 'DepartmentResults',cleanedArray);
					}
					else{
						console.log('results are the same.');
					}
					updateSyncCounts();
					this[1].find('td.status').html("<span class='glyphicon glyphicon-ok'></span> Done!");
					this[1].delay(1000).fadeOut();
					completedJobs++;
					update_progress_bar(callback);
				},
				error: function(data){
					if(data.status == 401){
						// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
						// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
						// quickLogin();
						this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error! Please refresh login");
					}
					else{
						// alert('Service call failed! Using cached values if available...');
						this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error!");
					}
					
					
				}
			});
		}

		var officeContext = [facility, $("<tr><th>" + facilities[i].displayname + " Office Lookup </td><td class='status'><span class='glyphicon glyphicon-calendar'></span> Queued</td></td></tr>")];
		officeContext[1].appendTo("#active_requests tbody");

		$.ajaxQueue("office", {
			url: services.getSelectedL7Base() + "OfficeLookup?query",
			type: 'POST',
			headers: {
				// "cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({ "facility": facility }),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			context: officeContext,
			success: function(data){

				cleanedOfficeArray = [];
				for(var i = 0; i < data.d.length; i++){
					cleanedOfficeArray.push([data.d[i].Value, data.d[i].Name]);
				}

				var currentResults = localStorage.getItem('facilityResults' + this[0] + 'OfficeResults');
				var newResults = JSON.stringify(cleanedOfficeArray);

				if(currentResults !== newResults){
					console.log('Updated local storage!');

					localStorage.setObject('facilityResults' + this[0] + 'OfficeResults',cleanedOfficeArray);

				}
				else{
					console.log('results are the same.');
				}
				updateSyncCounts();
				this[1].find('td.status').html("<span class='glyphicon glyphicon-ok'></span> Done!");
				this[1].delay(1000).fadeOut();
				completedJobs++;
				update_progress_bar(callback);
			},
			error: function(data){
				// alert('Service call failed!');
				// $(office_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				if(data.status == 401){
					// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
					// quickLogin();
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error! Please refresh login");
				}
				else{
					// alert('Service call failed! Using cached values if available...');
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error!");
				}
			}
		});
	}

 	for(i = 0; i < alphabet.length; i++){
 		letter = alphabet[i];

 		var employeeSearchContext = [letter, $("<tr><th>Employee search starting with letter " + letter +" </td><td class='status'><span class='glyphicon glyphicon-calendar'></span> Queued</td></td></tr>")];
		employeeSearchContext[1].appendTo("#active_requests tbody");

		$.ajaxQueue("employee",{
			url: services.getSelectedL7Base() + "EmployeeLookup?query",
			type: 'POST',
			headers: {
				// "cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({ "startsWith": employeeSearchContext[0]}),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			context: employeeSearchContext,
			success: function(data){
				
				
				if(!existingCache)
					existingCache = {};

				$.each(data.d, function(i,emp){
					var datum = {
						value:  emp.ContactName,
						tokens: [emp.ContactName , emp.ContactEmpid],
						ContactEmpid: emp.ContactEmpid,
						ContactType: emp.ContactType,
						ContactUid: emp.ContactUid
					};
					if(emp.ContactName.indexOf("XXINACTIVE") == -1){
						existingCache[datum.ContactEmpid] = datum;

					}
					

				});

				

				updateSyncCounts();
				this[1].find('td.status').html("<span class='glyphicon glyphicon-ok'></span> Done!");
				this[1].delay(1000).fadeOut();
				completedJobs++;
				update_progress_bar(callback);
			},
			error: function(data){
				// alert('Service call failed!');
				// $(office_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				if(data.status == 401){
					// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
					// quickLogin();
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error! Please refresh login");
				}
				else{
					// alert('Service call failed! Using cached values if available...');
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error!");
				}
			}
		});
 	}

	/*for(i = 0; i < workTaskCategories.length; i++){
 		category = workTaskCategories[i];

 		var workTaskContext = [category, $("<tr><th>Work Task Lookup for " + category +" </td><td class='status'><span class='glyphicon glyphicon-calendar'></span> Queued</td></td></tr>")];
		workTaskContext[1].appendTo("#active_requests tbody");

		$.ajaxQueue("workTask",{

			url: services.getSelectedL7Base() + "TaskLookup?query",
			type: 'POST',
			headers: {
				// "cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({ "type": workTaskContext[0]}),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			context: workTaskContext,
			success: function(data){
				
				if(!existingWorkTaskCache)
					existingWorkTaskCache = {};

				var taskArray = [];				
				$.each(data.d, function(i,task){
					taskArray.push({"TaskName" : task.TaskName, "TaskCode": task.TaskCode});

				});
				existingWorkTaskCache[this[0]] = taskArray;


				// console.log(taskArray);
				localStorage.setObject('workTasks', existingWorkTaskCache);
				

				updateSyncCounts();
				this[1].find('td.status').html("<span class='glyphicon glyphicon-ok'></span> Done!");
				this[1].delay(1000).fadeOut();
				completedJobs++;
				update_progress_bar(callback);
			},
			error: function(data){
				// alert('Service call failed!');
				// $(office_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				if(data.status == 401){
					// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
					// quickLogin();
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error! Please refresh login");
				}
				else{
					// alert('Service call failed! Using cached values if available...');
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error!");
				}
			}
		});
 	}*/

	for(i = 0; i < trendCodeCategories.length; i++){
 		category = trendCodeCategories[i];

 		var trendCodeContext = [category, $("<tr><th>Trend Code Lookup for " + category +" </td><td class='status'><span class='glyphicon glyphicon-calendar'></span> Queued</td></td></tr>")];
		trendCodeContext[1].appendTo("#active_requests tbody");

		$.ajaxQueue("trendCodes",{

			url: services.getSelectedL7Base() + "TrendCodesLookup",
			type: 'POST',
			headers: {
				// "cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({ "type": trendCodeContext[0]}),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			context: trendCodeContext,
			success: function(data){
				
				if(!existingTrendCodesCache)
					existingTrendCodesCache = {};

				function parseTasks(tasks) {
					var response = [];
					$.each(tasks, function(i,task) {
						var parsedTask = {"TaskName" : task.text, "TaskCode": task.code, "TaskChildren": null};
						if(task.children !== null)
							parsedTask.TaskChildren = parseTasks(task.children);
						response.push(parsedTask);
					});
					return response;
				}
				var taskArray = parseTasks(data.d);				
				//$.each(data.d, function(i,task){
				//	taskArray.push({"TaskName" : task.text, "TaskCode": task.code, "TaskChildren": task.children});
				//});
				existingTrendCodesCache[this[0]] = taskArray;


				// console.log(taskArray);
				localStorage.setObject('trendCodes', existingTrendCodesCache);
				

				updateSyncCounts();
				this[1].find('td.status').html("<span class='glyphicon glyphicon-ok'></span> Done!");
				this[1].delay(1000).fadeOut();
				completedJobs++;
				update_progress_bar(callback);
			},
			error: function(data){
				// alert('Service call failed!');
				// $(office_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				if(data.status == 401){
					// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
					// quickLogin();
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error! Please refresh login");
				}
				else{
					// alert('Service call failed! Using cached values if available...');
					this[1].find('td.status').html("<span class='glyphicon glyphicon-warning-sign'></span> Error!");
				}
			}
		});
 	}

}