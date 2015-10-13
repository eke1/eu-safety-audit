var cleanedArray;
var workTaskLookupTemplate;
var workTaskSelectedTemplate;
var workTasksSelected = {};
var current = 0;
var formMode = "new";
var auditeeSupervisorSameAsAuditor = true;
var draftSavetimer = null;

// get URL parameter function
function gup( name ){
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");  
	var regexS = "[\\?&]"+name+"=([^&#]*)";  
	var regex = new RegExp( regexS );  
	var results = regex.exec( window.location.href ); 
	if( results == null )
		return null;  
	else
		return results[1];
}



// Used on the 4 middle tabs
function updateCountsAll(){
	$(".panel-default").each(function(){
		updateCountsPanel(this);
	})
}
function updateCountsPanel(panel){
	var count_exceeds = $(panel).find("input[value='Exceeds']:checked").length;
	var count_meets = $(panel).find("input[value='Meets']:checked").length;
	var count_below = $(panel).find("input[value='Below']:checked").length;

	$(panel).find('span.count_exceeds').text('Exceeds: ' + count_exceeds).toggleClass('above_zero', count_exceeds > 0);
	$(panel).find('span.count_acceptable').text('Meets: ' + count_meets).toggleClass('above_zero', count_meets > 0);
	$(panel).find('span.count_below').text('Below: ' + count_below).toggleClass('above_zero', count_below > 0);
}


Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}


$(function(){
	

	// $("#viewing_entry_warning").hide();

	// $("#search_audit_link").click(function(e){
	// 	var answer = confirm('Navigating away from this form may result in data loss. Proceed?');
	// 	if (answer){
	// 		window.location = "bootstrap-search.html";
	// 	}
	// 	else{
	// 		e.preventDefault();
	// 	}
	// })

	// $("#safety_audit_link").click(function(e){
	// 	var answer = confirm('Reset the form? This may result in data loss. Proceed?');
	// 	if (answer){
	// 		window.location = "bootstrap-form.html";
	// 	}
	// 	else{
	// 		e.preventDefault();
	// 	}
	// })

	// $("#logout_link").click(function(e){
	// 	var answer = confirm('Logout? If you have not saved your form, this will result in data loss. Proceed?');
	// 	if (answer){
	// 		localStorage.oauthtoken = null;
	// 		window.location = "index.html";
	// 	}
	// 	else{
	// 		e.preventDefault();
	// 	}
	// })
	


	if(gup('viewid') != null){
		formMode = "view";
	}
	if(gup('draftid') != null){
		formMode = "draft";
	}

	if(formMode == "new"){
		var today = new Date();

		// Applies the time zone offset. valueAsDate takes in UTC
		document.getElementById('EventDate').valueAsDate = today - today.getTimezoneOffset()*60*1000;
		document.getElementById('EventTime').valueAsDate = today - today.getTimezoneOffset()*60*1000;

		navigator.geolocation.getCurrentPosition(onGPSSuccess, onGPSError);
	}


	$.validator.addMethod("pageRequired", function(value, element) {
		var $element = $(element)
		function match(index) {
			return current == index && $(element).parents("#sf" + (index + 1)).length;
		}
		if (match(0) || match(1) || match(2)) {
			return !this.optional(element);
		}
		return "dependency-mismatch";
	}, $.validator.messages.required)

	var main_form_validation = $("form").validate({
		errorClass: "warning",
		onkeyup: false,
		onblur: false,
		focusInvalid: false,
		submitHandler: function() {
			submitAuditForm();
		},
		ignore: ".checkbox-row, .checkbox-row-comment, .temp_ignore",
		invalidHandler: function(form, validator) {

			if (!validator.numberOfInvalids())
				return;

			if($(validator.errorList[0].element).is(":visible"))
				$('html, body').animate({scrollTop: $(validator.errorList[0].element).offset().top-150}, 1000);
			else{
				$('#form_tabs a[href="#'+ $(validator.errorList[0].element).parents('.tab-pane').attr('id') + '"]').tab('show');
				$('html, body').animate({scrollTop: $(validator.errorList[0].element).offset().top-150}, 1000);
			}
			console.error(validator.errorList);

		}
	});


	

	// $('input[name="ShiftId"]').rules("add", "required");
	// $('input[name="action_taken"]').rules("add", "required");

	// $(".btn-group .btn-toggle").click(function(){
	// 	// kill the popover
	// });

	$(".btn-form-next-tab").click(function(){

			// Since we want to validate just the current tab, add a temporary ignore class to any fields on the other tabs
			// This allows us total control over what jQuery validator is doing without messing with the ignore filter

			$(".tab-pane:not(.active) input, .tab-pane:not(.active) textarea, .tab-pane:not(.active) select").not(".checkbox-row, .checkbox-row-comment").addClass("temp_ignore");

			if(main_form_validation.form()){
				$("#form_tabs li.active").next().find('a').tab('show');

			}
			else{
				console.log('validation failed');
			}
			// Remove the temp_ignore even if it failed validation
			$(".temp_ignore").removeClass('temp_ignore');

		});
	$(".btn-form-previous-tab").click(function(){
		$("#form_tabs li.active").prev().find('a').tab('show');
	});


	setupFacilityListener("#ReportingDepartmentFacilityId", "#ReportingDepartmentId", undefined);
	setupFacilityListener("#ResponsibleDepartmentFacilityId", "#ResponsibleDepartmentId", "#ResponsibleOfficeCode");
	setupFacilityListener("#followup_responsible_facility", "#followup_responsible_department", undefined);

	$("#ResponsibleDepartmentId").change(function(){
		if(auditeeSupervisorSameAsAuditor){
			$("#ReportingDepartmentId").val($(this).val());
		}
	});

	function renderLocalStorageFacilityResults(entries, dropdown){
		

		if(entries  == null || entries.length == 0){
			$(dropdown).html("<option disabled>Loading...</option>").addClass('loading');
			return false;
		}
		else{
			$(dropdown).html("");
			for(var i = 0; i < entries.length; i++){
				$(dropdown).append("<option value='" + entries[i][0] + "'>" + entries[i][1] + "</option>");
			}
			$(dropdown).removeClass('loading');
			return true;
		}
		
	}
	function setupFacilityListener(facility_dropdown, department_dropdown, office_dropdown){
		
		$(facility_dropdown).change(function(){
			
			// Special case
			// Used to bind auditee facility and auditor facility together by default
			if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
				$("#ReportingDepartmentFacilityId").val($(this).val());
			}
			else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
				// If the auditor field was changed independantly, break the relation
				auditeeSupervisorSameAsAuditor = false;
			}

			// $(department_dropdown).html("<option disabled>Loading...</option>").addClass('loading');

			// if(localStorage.facilityResults == undefined)
			// 	localStorage.facilityResults = {};

			// if(localStorage['facilityResults' + $(this).val() + 'DepartmentResults'] == undefined)
			// 	localStorage['facilityResults' + $(this).val() + 'DepartmentResults'] = "[]";
			
			// if(localStorage['facilityResults' + $(this).val() + 'OfficeResults'] == undefined)
			// 	localStorage['facilityResults' + $(this).val() + 'OfficeResults'] = "[]";

			renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(this).val() + 'DepartmentResults'), department_dropdown);

			// Special case
			// Used to bind auditee facility and auditor facility together by default
			if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
				renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(this).val() + 'DepartmentResults'),"#ReportingDepartmentId");
			}
			else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
				// If the auditor field was changed independantly, break the relation
				auditeeSupervisorSameAsAuditor = false;
			}


			$.ajax({
				url: services.getSelectedL7Base() + "DepartmentLookup?query",
				type: 'POST',
				headers: {
					// "cache-control": "no-cache",
					"Authorization" : "Bearer "+localStorage.oauthtoken,
				},
				data: JSON.stringify({ "facility": $(this).val() }),
				contentType: "application/json; charset=utf-8",
				dataType: 'JSON',
				context: this,
				success: function(data){
					// $(department_dropdown).html("");
					// for(var i = 0; i < data.d.length; i++){
					// 	$(department_dropdown).append("<option value='" + data.d[i].Value + "'>" + data.d[i].Name + "</option>");
					// }
					// $(department_dropdown).removeClass('loading');
					// console.log(data.d);
					cleanedArray = [];
					for(var i = 0; i < data.d.length; i++){
						cleanedArray.push([data.d[i].Value, data.d[i].Name]);
					}
					// console.log(cleanedArray);

					// console.log(JSON.stringify(cleanedArray));
					var currentResults = localStorage.getItem('facilityResults' + $(this).val() + 'DepartmentResults');
					var newResults = JSON.stringify(cleanedArray);

					if(currentResults !== newResults){
						console.log('Updated local storage!');

						localStorage.setObject('facilityResults' + $(this).val() + 'DepartmentResults',cleanedArray);

						renderLocalStorageFacilityResults(cleanedArray, department_dropdown);

						// Special case
						// Used to bind auditee facility and auditor facility together by default
						if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
							renderLocalStorageFacilityResults(cleanedArray,"#ReportingDepartmentId");
						}
						else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
							// If the auditor field was changed independantly, break the relation
							auditeeSupervisorSameAsAuditor = false;
						}
					}
					else{
						console.log('results are the same.');
					}

				},
				error: function(data){
					if(data.status == 401){
						// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
						$("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
						quickLogin();
					}
					else{
						// alert('Service call failed! Using cached values if available...');
					}
					// $(department_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				}
			});

			if(office_dropdown != undefined){
				// $(office_dropdown).html("<option disabled>Loading...</option>").addClass('loading');

				renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(this).val() + 'OfficeResults'), office_dropdown);
				
				$.ajax({
					url: services.getSelectedL7Base() + "OfficeLookup?query",
					type: 'POST',
					headers: {
						// "cache-control": "no-cache",
						"Authorization" : "Bearer "+localStorage.oauthtoken,
					},
					data: JSON.stringify({ "facility": $(this).val() }),
					contentType: "application/json; charset=utf-8",
					dataType: 'JSON',
					context: this,
					success: function(data){
						// $(office_dropdown).html("");
						// for(var i = 0; i < data.d.length; i++){
						// 	$(office_dropdown).append("<option value='" + data.d[i].Value + "'>" + data.d[i].Name + "</option>");
						// }
						// $(office_dropdown).removeClass('loading');

						cleanedOfficeArray = [];
						for(var i = 0; i < data.d.length; i++){
							cleanedOfficeArray.push([data.d[i].Value, data.d[i].Name]);
						}
						// console.log(cleanedOfficeArray);

						// console.log(JSON.stringify(cleanedOfficeArray));
						var currentResults = localStorage.getItem('facilityResults' + $(this).val() + 'OfficeResults');
						var newResults = JSON.stringify(cleanedOfficeArray);

						if(currentResults !== newResults){
							console.log('Updated local storage!');

							localStorage.setObject('facilityResults' + $(this).val() + 'OfficeResults',cleanedOfficeArray);

							renderLocalStorageFacilityResults(cleanedOfficeArray, office_dropdown);
						}
						else{
							console.log('results are the same.');
						}
					},
					error: function(data){
						// alert('Service call failed!');
						// $(office_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
					}
				});
			}


		});


	}

	$("#supervisor_of_auditee, #assignment_person, #auditor").typeahead([{
		name: 'employeeLookup',
		limit: 15,
		remote: {
			url: services.getSelectedL7Base() + "EmployeeLookup?query",
			dataType: 'json',
			beforeSend: function(xhr, settings, query) {
				xhr.setRequestHeader("Authorization" , "Bearer "+localStorage.oauthtoken);
				xhr.setRequestHeader("Content-Type","application/json; charset=UTF-8");
				xhr.setRequestHeader("cache-control","no-cache");
				settings.type = 'POST';
				var regex = new RegExp("[?]([^&]*)");
				var results = regex.exec(this.url); 
				settings.data = JSON.stringify({ "startsWith": results[1]});
				settings.hasContent=true;

			},
			replace: function(url, uriEncodedQuery){
					//empquery = uriEncodedQuery;
					return  url.replace('query', uriEncodedQuery);
				},
				cache: true,
				filter:function (data) {
					var newData = [];
					$.each(data.d, function(i,emp){
						newData.push({
							value:  emp.ContactName,
							tokens: [emp.ContactName , emp.ContactEmpid],
							ContactEmpid: emp.ContactEmpid,
							ContactType: emp.ContactType,
							ContactUid: emp.ContactUid
						});
					});
					return newData;
				}
			}
		}]).bind('typeahead:selected', function(obj, datum) {
			$("#" + $(this).attr('id')+"_empid").val(datum.ContactEmpid);
			$("#" + $(this).attr('id')+"_type").val(datum.ContactType);
			$("#" + $(this).attr('id')+"_uid").val(datum.ContactUid);
			

			// If the supervisor of auditee field was modified, send the same value to the Auditor field by default
			if($(this).attr('id') == 'supervisor_of_auditee' && auditeeSupervisorSameAsAuditor){
				$("#auditor").val(datum.value);
				$("#auditor_empid").val(datum.ContactEmpid);
				$("#auditor_type").val(datum.ContactType);
				$("#auditor_uid").val(datum.ContactUid);	
			}
			else if($(this).attr('id') == "auditor"){
				// If the auditor was edited directly, break the supervisor of auditee -> same as auditor relation
				auditeeSupervisorSameAsAuditor = false;
			}

			// $(".btn-group-vendor-trend-descissue label, .btn-group-vendor-trend-desc label").removeClass('disabled');
		});



	$("#vendor_name").typeahead([{
		name: 'vendorLookup',
		remote: {
			url: services.getSelectedL7Base() + "VendorLookup?query",
			dataType: 'json',
			beforeSend: function(xhr, settings, query) {
				xhr.setRequestHeader("Authorization" , "Bearer "+localStorage.oauthtoken);
				xhr.setRequestHeader("Content-Type","application/json; charset=UTF-8");
				xhr.setRequestHeader("cache-control","no-cache");
				settings.type = 'POST';
				var regex = new RegExp("[?]([^&]*)");
				var results = regex.exec(this.url); 
				settings.data = JSON.stringify({ "contains": results[1]});
				settings.hasContent=true;
				
			},
			replace: function(url, uriEncodedQuery){
				//empquery = uriEncodedQuery;
				return  url.replace('query', uriEncodedQuery);
			},
			cache: false,
			filter:function (data) {
				var newData = [];
				$.each(data.d, function(i,vendor){
					newData.push({
						value:  vendor.VendorName,
						tokens: [vendor.VendorName],
						vendor_code: vendor.VendorCode,
						vendor_suffix: vendor.VendorSuffix,
					});
				});
				return newData;
			}
		}
	}]);

	$('#vendor_name').bind('typeahead:selected', function(obj, datum) {
		$("#vendor_code").val(datum.vendor_code);
		$("#vendor_suffix").val(datum.vendor_suffix);
		$(".btn-group-vendor-trend-issue label, .btn-group-vendor-trend-desc label").removeClass('disabled');
	});

	$(".btn-clear-textfield-typeahead-vendor").click(function(){
		$(this).parent().parent().find('input.form-control').typeahead('setQuery', '');
		$(".btn-group-vendor-trend-issue label, .btn-group-vendor-trend-desc label").addClass('disabled').removeClass('active');
		$("#vendor_code").val('');
		$(".btn-group-vendor-trend-issue label input, .btn-group-vendor-trend-desc label input").prop("checked", false);
	});

	$(".btn-clear-textfield-typeahead").click(function(){
		$(this).parent().parent().find('input.form-control').typeahead('setQuery', '');
	});


	// $("#GeoLocation").val()


	var source   = $("#entry-template").html();
	var template = Handlebars.compile(source);

	

	Handlebars.registerHelper('generateId', function(text) {
		return new Handlebars.SafeString(text.replace(/[^a-zA-Z]/g, ""));
	});
	Handlebars.registerHelper('generateName', function(tabid, code) {
		return new Handlebars.SafeString(tabid.replace(/[^a-zA-Z]/g, "")+'_'+code.replace(/[^a-zA-Z0-9]/g, ""));
	});
	Handlebars.registerHelper('indexMod', function(index, mod, options) {
	  if(index % mod == 0) {
	    return options.fn(this);
	  }
	});

	$("#tab_materialcondition .panel-group").html(template({tabid: 'Material', myObject: tab_layouts['Material']}));
	$("#tab_legalreqs .panel-group").html(template({tabid: 'Legal', myObject: tab_layouts['Legal']}));
	$("#tab_defensivedriving .panel-group").html(template({tabid: 'Defensive', myObject: tab_layouts['Defensive']}));
	$("#tab_humanperf .panel-group").html(template({tabid: 'Human Perf', myObject: tab_layouts['Human Perf']}));

	$(".panel-collapse").collapse('hide');

	$("#btn_use_device_gps").click(function(){
		$("#GeoLocation").val("Loading...");
		navigator.geolocation.getCurrentPosition(onGPSSuccess, onGPSError);
	})

	$("textarea[maxlength]").each(function(){
		var $this = $(this);
		var maxLength = parseInt($this.attr('maxlength'));
		$this.attr('maxlength', null);
		
		var el = $("<span class=\"character-count\">" + maxLength + " characters remaining</span>");
		el.insertAfter($this);
		
		$this.bind('keyup', function() {
			var cc = $this.val().length;
			
			el.text(maxLength - cc + " characters remaining");
			
			if(maxLength < cc) {
				el.css('color', 'red');
			} else {
				el.css('color', null);
			}
		});
	})

	$("input[name='action_taken']").change(function(){
		if($(this).attr('id') == "action_take_coaching_with_followup")
			$("#section-coaching-with-followup").show();
		else{
			$("#section-coaching-with-followup").hide();
		}
	})
	$("#followup_tracked_in_passport").change(function(){
		if($(this).is(":checked")){
			$("#section-coaching-with-followup-in-passport").show();
			$("#section-coaching-with-followup-in-passport input[type='text'], #section-coaching-with-followup-in-passport input[type='checkbox'], #section-coaching-with-followup-in-passport input[type='date'], #section-coaching-with-followup-in-passport select, #section-coaching-with-followup-in-passport textarea").prop('required', true);
		} else {
			$("#section-coaching-with-followup-in-passport").hide();
			$("#section-coaching-with-followup-in-passport input[type='text'], #section-coaching-with-followup-in-passport input[type='checkbox'], #section-coaching-with-followup-in-passport input[type='date'], #section-coaching-with-followup-in-passport select, #section-coaching-with-followup-in-passport textarea").prop('required', false);
		}
	});

	$(".btn-toggle").click(function(e){

		if($(this).children('input').prop('checked')){
			
			if($(this).children('input').hasClass('checkbox-row')){
				if($(this).hasClass('active')){

					$(this).children('input').prop('checked', false).removeClass('needsclick');
					$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('disabled', true);
					$(this).removeClass('active');

					updateCountsPanel($(this).parents('.panel-default'));

					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
					return;		
				}
				else{
					$("input[name='" + $(this).children('input').attr('name') + "']").removeClass('needsclick');
					$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('disabled', false);

					// Bug fix to prevent double click firing event from fastclick
					$(this).children('input').addClass('needsclick');

					updateCountsPanel($(this).parents('.panel-default'));
				}
			}
			
			if($(this).children('input').attr('type') == 'radio'){
				// Need to deselect the others in the group.
				// $(this).parent().children('label')
				// $(this).parent().children('input').prop('checked', false);
				var name = $(this).children('input').attr('name');
				$("input[name='" + name + "']").each(function(){
					$(this).parent().removeClass('active');
				});
				// $(this).children('input').prop('checked', true);

			}
			$(this).addClass('active');
		}
		else{
			
			$(this).removeClass('active');
		}

		
	});

	
	// Figure out a way to block this change handler on initial loading
	// Limit scope too!
	$("form#driverform input, form#driverform select, form#driverform textarea").change(function(){
		if(draftSavetimer != null){
			clearTimeout(draftSavetimer);
		}
		$(".tinyalert").addClass('visible').text('Unsaved changes');
		draftSavetimer = setTimeout(function(){
			updateDraft();
			$(".tinyalert").text('Saving Draft');
			setTimeout(function(){$(".tinyalert").removeClass('visible')}, 2000);
		}, 5000);
		
	});

	
	if(formMode == "view")
		loadFormEntry(gup('viewid'));
	else if(formMode == "draft")
		loadDraft(gup('draftid'));

	FastClick.attach(document.body);
});

function onGPSSuccess(position) {
	$("#GeoLocation").val(position.coords.latitude + ", " + position.coords.longitude);
}

function onGPSError(error) {
	alert('code: '    + error.code    + '\n' +	'message: ' + error.message + '\n');
}






























String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
}

function buildJSONObject(){
	var savedForm;

	savedForm = {
		// "__type": "Exelon.ManagementSafetyAudits.Services.ARData",
		"ARStatus": "InRevision",
		"AuditeeStatus": $("#AuditeeStatus").val(),
		"AuditorX": {
			// "__type": "Exelon.ManagementSafetyAudits.Services.ARContact",
			"ContactEmpid": $("#auditor_empid").val(),
			"ContactName": $("#auditor").val(),
			"ContactType": $("#auditor_type").val(),
			"ContactUid": $("#auditor_uid").val(),
		},
		"EventDate": $("#EventDate").val(),
		"EventTime": $("#EventTime").val(),
		"GeoLocation": $("#GeoLocation").val(),
		"ImmediateActions": $("#followup_actions_to_be_taken").val(),
		"IsNearMiss": $("#IsNearMiss").is(":checked"),
		"PhaseParked": $("#PhaseParked").is(":checked"),
		"PhaseDriving": $("#PhaseDriving").is(":checked"),
		"PhaseBacking": $("#PhaseBacking").is(":checked"),
		// "PlanId": $("input[name='PlanId']:checked").val(),
		"ProblemDescription": $("#overall_comments").val(),
		"ReportingDepartmentFacilityId": $("#ReportingDepartmentFacilityId").val(),
		"ReportingDepartmentId": $("#ReportingDepartmentId").val(),
		"ResponsibleDepartmentFacilityId": $("#ResponsibleDepartmentFacilityId").val(),
		"ResponsibleDepartmentId": $("#ResponsibleDepartmentId").val(),
		"ResponsibleOfficeCode": $("#ResponsibleOfficeCode").val(),
		"ShiftId": $("input[name='ShiftId']:checked").val(),
		"SupervisorManagerX": {
			// "__type": "Exelon.ManagementSafetyAudits.Services.ARContact",
			"ContactEmpid": $("#supervisor_of_auditee_empid").val(),
			"ContactName": $("#supervisor_of_auditee").val(),
			"ContactType": $("#supervisor_of_auditee_type").val(),
			"ContactUid": $("#supervisor_of_auditee_uid").val(),
		},
		"WeatherConditionsX": $(".weather-conditions-group input:checked").map(function(){ return $(this).val().trim(); }).get(),
		"vehicle_number" : $("#vehicle_number").val(),
	};

	
	if($("#vendor_name").val().length > 0){
		savedForm.VendorIssue = {
			"Vendor": {
				// "__type": "Exelon.ManagementSafetyAudits.Services.Vendor",
				"VendorName": $("#vendor_name").val(),
				"VendorCode": $("#vendor_code").val(),
				"VendorSuffix": $("#vendor_suffix").val()
			},
			"TCCode2": $("input[name='TCCode2']:checked").val(),
			"TCCode3": $("input[name='TCCode3']:checked").val(),
			"Timestamp": null
		}
	}

	function buildCheckboxEntries(tabid){
		var checkboxes = $(tabid + " input.checkbox-row:checked").map(function(){ 
			var checkbox_entry =  {
				"TCComments": $("input[name='" + $(this).attr('name') + "_comment']").val(),
				"TCLevel2": $(this).attr('data-code').substring(0,1),
				"TCLevel2Description": "",
				"TCLevel3": $(this).attr('data-code').substring(1),
				"TCLevel3Description": "",
				"TCRank": $(this).val().capitalize()
			};
			return checkbox_entry;

		});
		return checkboxes.get();
	}


	
	savedForm.HumanPerformanceToolsX = buildCheckboxEntries("#tab_humanperf");
	savedForm.MaterialConditionX = buildCheckboxEntries("#tab_materialcondition");
	savedForm.LegalProceduresX = buildCheckboxEntries("#tab_legal");
	savedForm.DefensiveDrivingX = buildCheckboxEntries("#tab_defensive");


	if($("#followup_tracked_in_passport").is(":checked"))	{
		savedForm.FollowupAssignmentX = {
			// "ActionsTaken": $("#followup_actions_to_be_taken").val(),
			// "ApproverFirstName": "",
			// "ApproverId": "",
			// "ApproverLastName": "",
			// "ARNumber": "",
			// "ARToBackground": "00000020",
			// "AssignmentClosureNotes": "",
			// "AssignmentCompletedDate": "",
			"AssignmentConcurrenceFirstName": $("#assignment_person").val(),
			"AssignmentConcurrenceId": $("#assignment_person_empid").val(),
			"AssignmentConcurrenceLastName": "",
			// "AssignmentCreatedBy": "WEB",
			"AssignmentDescriptionNotes": $("#assignment_details").val(),
			"AssignmentDueDate": $("#followup_duedate").val(),
			// "AssignmentNumber": "02",
			// "AssignmentPriority": "",
			// "AssignmentStatusDescription": "Notify Pri",
			"AssignmentSubject": $("#assignment_subject").val(),
			"AssignmentType": $("input[name='followup_assignment_type']").val(),
			// "AssignmentTypeDescription": $("input[name='followup_assignment_type']").val(),
			"CancellationPending": false,
			"Checked": true,
			"CompletionPending": false,
			"PrimaryResponsibleDepartmentFacilityId": $("#followup_responsible_facility").val(),
			// "PrimaryResponsibleDepartmentFacilityName": $("#followup_responsible_facility option:selected").text(),
			"PrimaryResponsibleDepartmentId": $("#followup_responsible_department").val(),
			// "PrimaryResponsibleDepartmentName": $("#followup_responsible_department option:selected").text(),
		}
	}
	else{

		savedForm.FollowupAssignmentX = {};
	}

	return savedForm;
}

function loadJSONFormObject(formObject){

	$("#AuditeeStatus").val(formObject.AuditeeStatus);

	$("#auditor_empid").val(formObject.AuditorX.ContactEmpid);
	$("#auditor").val(formObject.AuditorX.ContactName);
	$("#auditor_type").val(formObject.AuditorX.ContactType);
	$("#auditor_uid").val(formObject.AuditorX.ContactUid);

	if(formObject.EventDate != undefined){
		
		document.getElementById('EventDate').valueAsDate = moment(formObject.EventDate, ["MM/DD/YYYY", "YYYY-MM-DD"]).format("X")*1000;

	}
	$("#EventTime").val(formObject.EventTime);
	$("#GeoLocation").val(formObject.GeoLocation);

	$("#overall_comments").val(formObject.ProblemDescription);

	$("#ReportingDepartmentFacilityId").val(formObject.ReportingDepartmentFacilityId);
	$("#ResponsibleDepartmentFacilityId").val(formObject.ResponsibleDepartmentFacilityId);

	$("#ReportingDepartmentId").html("<option selected>" + formObject.ReportingDepartmentId + "</option>");
	$("#ResponsibleDepartmentId").html("<option selected>" + formObject.ResponsibleDepartmentId + "</option>");
	$("#ResponsibleOfficeCode").html("<option selected>" + formObject.ResponsibleOfficeCode + "</option>");

	$("#supervisor_of_auditee_empid").val(formObject.SupervisorManagerX.ContactEmpid);
	$("#supervisor_of_auditee").val(formObject.SupervisorManagerX.ContactName);
	$("#supervisor_of_auditee_type").val(formObject.SupervisorManagerX.ContactType);
	$("#supervisor_of_auditee_uid").val(formObject.SupervisorManagerX.ContactUid);

	processBtnGroupCheckbox("#IsNearMiss", formObject.IsNearMiss);
	processBtnGroupCheckbox("#PhaseParked", formObject.PhaseParked);
	processBtnGroupCheckbox("#PhaseDriving", formObject.PhaseDriving);
	processBtnGroupCheckbox("#PhaseBacking", formObject.PhaseBacking);

	$("#vehicle_number").val(formObject.vehicle_number);

	// processBtnGroupRadio("input[name='PlanId']", formObject.PlanId);
	// processBtnGroupRadio("input[name='ShiftId']", formObject.ShiftId);

	// console.log(formObject);

	for(var i = 0; i < formObject.WeatherConditionsX.length; i ++){
		$(".weather-conditions-group input[value='" + formObject.WeatherConditionsX[i] + "']").click();
	}

	

	if(formObject.VendorIssue != undefined && formObject.VendorIssue.Vendor != undefined){
		$("#vendor_name").val(formObject.VendorIssue.Vendor.VendorName);
		$("#vendor_code").val(formObject.VendorIssue.Vendor.VendorCode);
		$("#vendor_suffix").val(formObject.VendorIssue.Vendor.VendorSuffix);

		$(".btn-group-vendor-trend-issue label, .btn-group-vendor-trend-desc label").removeClass('disabled');

		$("input[name='TCCode2'][value='" + formObject.VendorIssue.TCCode2 + "']").parent().click();
		$("input[name='TCCode3'][value='" + formObject.VendorIssue.TCCode3 + "']").parent().click();
	}

	function readInCheckboxRows(tabid, data){
		for(var i = 0; i < data.length; i++){	
			var selector = tabid + " input.checkbox-row[data-code='" +  data[i].TCLevel2 + data[i].TCLevel3 + "'][value='" + data[i].TCRank + "']";
			var comment_selector = tabid + " input.checkbox-row-comment[data-code='" +  data[i].TCLevel2 + data[i].TCLevel3 + "']";
			$(selector).click().parent().addClass('active');
			$(comment_selector).prop('disabled', false).val(data[i].TCComments);

			// console.log(data[i]);
			// console.log(selector);
		}	
	}
	
	readInCheckboxRows("#tab_humanperf", formObject.HumanPerformanceToolsX);
	readInCheckboxRows("#tab_materialcondition", formObject.MaterialConditionX);	
	readInCheckboxRows("#tab_legal", formObject.LegalProceduresX);
	readInCheckboxRows("#tab_defensive", formObject.DefensiveDrivingX);


	updateCountsAll();



	

	if(formObject.ImmediateActions.length > 0){
		$("#section-coaching-with-followup").show();
		$("input[name='action_taken'][value='Coaching With Followup']").prop('checked', true).parent().addClass('active');
	}
	else{
		$("#section-coaching-with-followup").hide();
		$("input[name='action_taken'][value='Coaching Only']").prop('checked', true).parent().addClass('active');
	}

	$("#followup_actions_to_be_taken").val(formObject.ImmediateActions);

	if(formObject.FollowupAssignmentX != undefined && formObject.FollowupAssignmentX.AssignmentSubject != ""){
		$("#followup_tracked_in_passport").addClass('active').prop('checked', true);
		$("#section-coaching-with-followup-in-passport").show();

		
		$("#followup_responsible_facility").val(formObject.FollowupAssignmentX.PrimaryResponsibleDepartmentFacilityId);
		$("#followup_responsible_department").html("<option value='" + formObject.FollowupAssignmentX.PrimaryResponsibleDepartmentId + "' selected>" + 
			formObject.FollowupAssignmentX.PrimaryResponsibleDepartmentName + "</option>");

		$("#assignment_subject").val(formObject.FollowupAssignmentX.AssignmentSubject);
		$("#assignment_details").val(formObject.FollowupAssignmentX.AssignmentDescriptionNotes);

		$("input[name='followup_assignment_type'][value='" + formObject.FollowupAssignmentX.AssignmentType + "']").prop('checked', true).parent().addClass('active');

		document.getElementById('followup_duedate').valueAsDate = moment(formObject.FollowupAssignmentX.AssignmentDueDate, "MM/DD/YYYY").format("X")*1000;

		$("#assignment_person_empid").val(formObject.FollowupAssignmentX.AssignmentConcurrenceId);
		$("#assignment_person").val(formObject.FollowupAssignmentX.AssignmentConcurrenceLastName + ", " + formObject.FollowupAssignmentX.AssignmentConcurrenceFirstName);
		// $("#assignment_person_type").val(formObject.FollowupAssignmentX.ContactType);
		// $("#assignment_person_uid").val(formObject.FollowupAssignmentX.ContactUid);
	}
}







var submitted = false;
function submitAuditForm(){
	
	if(!checkOfflineStatus()){
		$('#quickLogin').modal('show');
		$('#quickLogin #quick_login_reason').text("You will need to login before submitting this form.");
		return;
	}
	if(submitted){
		$('#myModal').modal('show');
		$("#myModal .modal-body").text("This form has already been submitted. Open the menu to start a new entry.");
		return;
	}

	var savedForm = buildJSONObject();

	// console.log(savedForm);

	$('#myModal').modal('show');
	
	$("#myModal .modal-body").text("Not yet functional! Sorry!");

	// $.ajax({
	// 	url: services.getSelectedL7Base() + "SubmitAR",
	// 	type: 'POST',
	// 	headers: {
	// 		"cache-control": "no-cache",
	// 		"Authorization" : "Bearer "+localStorage.oauthtoken,
	// 	},
	// 	data: JSON.stringify({"auditData": savedForm}),
	// 	contentType: "application/json; charset=utf-8",
	// 	dataType: 'JSON',
	// 	success: function(data){
			

	// 		if(isNumber(data.d)){
	// 			$("#myModal .modal-body").text("Success! The new AR ID is " + data.d);	

	// 			var returnedARID = data.d;
	// 			if(pictureURI != undefined && pictureURI != ""){
	// 				$("#myModal .modal-body").append("<br>Uploading photo");
	// 				uploadPhoto(returnedARID);
	// 			}
	// 			deleteDraft();
	// 			submitted = true;
	// 		}
	// 		else{
	// 			console.log(data);
	// 			$("#myModal .modal-body").text("Error! " + data.d);		
	// 		}
			
	// 	},
	// 	error: function(data){
	// 		console.error(data);
	// 		if(data.status == 401){
	// 			//alert('Unauthorized! Your login may have expired. Please logout and log back in.')
	// 			$("#myModal .modal-body").text("Your login may have expired, please reenter your login details to continue, then try saving again.");
	// 			// $("#myModal").modal('hide');
	// 			// quickLogin();
	// 		}
	// 		else{
	// 			$("#myModal .modal-body").text('Form failed to save. The error returned was: ' + data.responseText);
	// 		}
	// 	}
	// });
}








function updateDraft(){
	console.log("Updating draft!");
	draftsDB.updateWorkingDraft(buildJSONObject(), "Driver Audit", "TODO: Fill this in!");
}

function loadDraft(draftid){
	draftsDB.setCurrentDraftID(draftid);
	draftsDB.getDraft(draftid, function(jsonData){
		console.log("Reading in draft");
		loadJSONFormObject(jsonData);
	});
}

function deleteDraft(){
	draftsDB.deleteDraft(draftsDB.current_draftid);
}





function processBtnGroupCheckbox(id, value){
	if(value == true){
		$(id).prop('checked', true).parent('label.btn-toggle').addClass('active');
	}
}
function processBtnGroupRadio(id, value){
	$(id+"[value='" + value + "']").prop('checked', true).parent('label.btn-toggle').addClass('active');
}



function loadFormEntry(id){
	$('#myModal').modal('show');
	$("#myModal .modal-title").text("Loading Audit");
	$("#myModal .modal-body").text("Loading the saved form...");
	$("#viewing_entry_warning").show();
	$("#lookup-work-tasks-button").hide();
	$.ajax({
		url: services.getSelectedL7Base() + "ViewAR",
		type: 'POST',
		headers: {
			"cache-control": "no-cache",
			"Authorization" : "Bearer "+localStorage.oauthtoken,
		},
		data: JSON.stringify({"ARId": id}),
		contentType: "application/json; charset=utf-8",
		dataType: 'JSON',
		success: function(data){
			$("#myModal .modal-body").text("Success!");

			loadJSONFormObject(data.d);
			
			$("input, select, textarea").prop('readonly', true).prop('disabled', true);


			$.ajax({
				url: services.getSelectedL7Base() + "GetThumbNails",
				type: 'POST',
				headers: {
					"cache-control": "no-cache",
					"Authorization" : "Bearer "+localStorage.oauthtoken,
				},
				data: JSON.stringify({"ARID": id}),
				contentType: "application/json; charset=utf-8",
				dataType: 'JSON',
				success: function(data){
					// console.log(data);
					if(data.d != undefined){
						for(var i = 0; i < data.d.length; i++){
							// console.log(data.d[i]);
							$("#largeImage").addClass('animate').attr('src', "data:image/jpg;base64," + data.d[i].Content).attr('data-imageid', data.d[i].Imgid).attr('data-fullres', false);
						}
					}

					$("#largeImage").click(function(){
						if($(this).attr('data-fullres') != 'true'){
							$("#largeImage").parent().addClass('imageLoading');
							// $("#largeImage").after('<p>Loading full resolution photo</p><div class="progress progress-striped active"><div class="progress-bar"  id="photo_progess_bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">    <span class="sr-only">0% Complete</span>  </div></div>');
							$.ajax({
								url: services.getSelectedL7Base() + "GetImage",
								type: 'POST',
								headers: {
									"cache-control": "no-cache",
									"Authorization" : "Bearer "+localStorage.oauthtoken,
								},
								data: JSON.stringify({"IMGID": $(this).attr('data-imageid')}),
								contentType: "application/json; charset=utf-8",
								dataType: 'JSON',
								success: function(data){
									// console.log(data);
									if(data.d != undefined){
										$("#largeImage").attr('src', "data:image/jpg;base64," + data.d).attr('data-fullres', true).parent().removeClass('imageLoading');
									}
								
								},
								error: function(data){
									console.error(data);
									
								}
							});
						} else {
							$(this).toggleClass('imageZoom');
						}
					});
				
				},
				error: function(data){
					console.error(data);
				}
			});

			setTimeout("$('#myModal').modal('hide');", 1000)

		},
		error: function(data){
			console.error(data);
			$("#myModal .modal-body").text('Form failed to load. The error returned was: ' + data.responseText);
		}
	});
}




var pictureURI;
var lat = "";
var lng = "";


function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Called when a photo is successfully retrieved

function onPhotoDataSuccess(imageURI) {

	$("#largeImage").attr('src', imageURI).addClass('animate');
	pictureURI = imageURI;
	ExifReader.getExifData(imageURI, exiftest, exiffail); 
	$("#remove_photo_button").show();
}

// Called when a photo is successfully retrieved
//
function onPhotoURISuccess(imageURI) {
  // Uncomment to view the image file URI
  // console.log(imageURI);

  $("#largeImage").attr('src', imageURI).addClass('animate');
  pictureURI = imageURI;
  // $("#fileuri").text(imageURI);
  // $("#hugearea").text(ExifReader.getExifData(imageURI));
  // $("#hugearea").html("MAKING CALL TO EXIF READER");
  ExifReader.getExifData(imageURI, exiftest, exiffail); 
  // $("#upload_photo_button").removeClass('ui-disabled').text('Upload Photo');
  $("#remove_photo_button").show();
  $("#exif_from_photo").text("Trying to load EXIF...");
}

function getDMS2DD(values, direction) { 
	direction.toUpperCase(); 
	var dd = values;
	//alert(dd); 
	if (direction == "S" || direction == "W") { 
		dd = dd*-1; 
	} // Don't do anything for N or E 
	return dd; 
}

function exiftest(exif){
	exif = $.parseJSON(exif);

	if(exif['Latitude'] != null && exif['Longitude'] != null){
		lat = getDMS2DD(exif['Latitude'], exif['LatitudeRef']);
		lng = getDMS2DD(exif['Longitude'], exif['LongitudeRef']);
		$("#exif_from_photo").text('Loaded EXIF data, location data will be submitted with the photo.');
	}
	else{
		// alert('Not JSON?!');
		$("#exif_from_photo").text("Unable to load GPS information from the EXIF tags. The photo will be uploaded but cannot be plotted on a map.");
	}
}
function exiffail(data){
	$("#exif_from_photo").text("Unable to load GPS information from the EXIF tags. The photo will be uploaded but cannot be plotted on a map.");
}
// A button will call this function
//
function capturePhoto() {
	navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 100,
		destinationType: navigator.camera.DestinationType.NATIVE_URI,
		correctOrientation: true,
		saveToPhotoAlbum: true });
}

function getPhoto() {
  // Retrieve image file location from specified source
  navigator.camera.getPicture(onPhotoURISuccess, onFail, {
  	destinationType: navigator.camera.DestinationType.NATIVE_URI,
  	sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY });
}

function removePhoto(){
	pictureURI = "";
	$("#largeImage").addClass('removePhoto').attr('src', "");
	$("#exif_from_photo").text("");
	$("#remove_photo_button").hide();
	setTimeout("removePhotoStep2()", 300);
}
function removePhotoStep2(){
	$("#largeImage").removeClass('removePhoto animate');
}


// Called if something bad happens.
function onFail(message) {
  alert('Failed because: ' + message);
}

function uploadPhoto(arid) {
	var options = new FileUploadOptions();
	var filetimestamp = new Date().getTime().toString();

	options.fileKey="contents";
	// options.fileName=pictureURI.substr(pictureURI.lastIndexOf('/')+1)+'.jpg';
	options.fileName="test-ipadupload" + filetimestamp + ".jpg";
	options.mimeType="image/jpeg";

	var params = {};
	params.ARID = arid;
	params.LON = lng;
	params.LAT = lat;
	// params.desc = $("#photo_description").text();
	options.headers={Authorization : "Bearer "+localStorage.oauthtoken};
	
	// console.log(params);

	options.params = params;
	
	// $("#upload_status").addClass('visible');
	// $("#upload_photo_button").text('Uploading...');
	var ft = new FileTransfer();

	ft.onprogress = function(progressEvent) {
		if (progressEvent.lengthComputable) {
			$("#photo_progess_bar").css('width', (progressEvent.loaded / progressEvent.total)*100 + "%");
		} 
	};
	
	ft.onwrite = function(event){
		$("#photo_progess_bar").css('width', "100%");
		$("#myModal .modal-body").append('Photo upload complete!');
	}

	$("#myModal .modal-body").append('<div class="progress progress-striped active"><div class="progress-bar"  id="photo_progess_bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">    <span class="sr-only">45% Complete</span>  </div></div>');
	ft.upload(pictureURI, encodeURI(services.getSelectedL7Base() + "UploadImage"), win, fail, options);
}

function win(r) {
	$("#photo_progess_bar").css('width', "100%");
	$("#myModal .modal-body").append('Photo upload complete!');
}

function fail(error) {
	alert("An error has occurred: Code = " + error.code);
	console.log("upload error source " + error.source);
	console.log("upload error target " + error.target);

}





































