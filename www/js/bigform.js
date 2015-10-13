var workTaskLookupTemplate;
var workTaskSelectedTemplate;
var workTasksSelected = {};
var current = 0;
var formMode = "new"; // Note that this can be changed to "edit" when an audit is loaded and the status is '20' meaning in progress
var formTabs;
var auditeeSupervisorSameAsAuditor = true;
var draftSavetimer = null;


function addSelectedTasks(){
	
	$("#worktasks-lookup-modal").modal('hide');

	$("input.worktask-lookup:checked").each(function(){
		// Stored as an object to avoid duplication
		workTasksSelected[$(this).attr('data-taskcode')] = {TaskCode: $(this).attr('data-taskcode'), TaskName: $(this).attr('data-taskname')};

	});

	$(".worktask-selected-row").remove();
	$("#worktask-nothing-selected").hide();

	$("#worktask-selected-tbody").append(
		workTaskSelectedTemplate({tasks: workTasksSelected})
	);
}
function removeTask(taskCode){
	delete workTasksSelected[taskCode];

	$(".worktask-selected-row").remove();
	
	$("#worktask-selected-tbody").append(
		workTaskSelectedTemplate({tasks: workTasksSelected})
		);
	if($("#worktask-selected-tbody tr").length <= 1){
		$("#worktask-nothing-selected").show();
	}
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

	$(panel).find('span.count_exceeds').text(count_exceeds).parent().toggleClass('above_zero', count_exceeds > 0);
	$(panel).find('span.count_acceptable').text(count_meets).parent().toggleClass('above_zero', count_meets > 0);
	$(panel).find('span.count_below').text(count_below).parent().toggleClass('above_zero', count_below > 0);
}


$(function(){
	$("#viewing_entry_warning").hide();

	$("#nav a").click(function(){
		if(draftSavetimer != null){
			clearTimeout(draftSavetimer);
			draftSavetimer = null;
			var clicked_link = this;
			updateDraft(function(result){
				console.log("In the callback, should be clicking " + clicked_link);
				// $(clicked_link).click();
				$("#draftAlert").text('Saved Draft');
				window.location.href = clicked_link;
			});
			$("#draftAlert").text('Saving Draft');
			return false;
		}
		return true;
	});

	// formMode can be later changed to "edit" if a loaded audit is in status '20' -- meaning it can be edited
	if(get_url_parameter('viewid') != null){
		formMode = "view";
	}
	if(get_url_parameter('draftid') != null){
		formMode = "draft";
	}

	if(formMode == "new"){
		var today = new Date();

		// Applies the time zone offset. valueAsDate takes in UTC
		document.getElementById('EventDate').valueAsDate = today - today.getTimezoneOffset()*60*1000;
		document.getElementById('EventTime').valueAsDate = today - today.getTimezoneOffset()*60*1000;

		// navigator.geolocation.getCurrentPosition(onGPSSuccess, onGPSError);
	}
	if(get_url_parameter('type') == "peertopeer"){
		formType = "Peer to Peer";
		formTabs = peer_to_peer_tab_layouts;
		$("#form_type_name").text("Peer to Peer Observation");
		$(".safety_audit_only").hide().find('input').removeAttr('required');
	}
	else{
		formType = "Safety Audit";
		formTabs = tab_layouts;
		$(".peer_to_peer_only").hide();
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
		ignore: ".checkbox-row, .temp_ignore",
		invalidHandler: function(form, validator) {

			if (!validator.numberOfInvalids())
				return;

			if($(validator.errorList[0].element).is(":visible"))
				$('html, body').animate({scrollTop: $(validator.errorList[0].element).offset().top-150}, 1000);
			else{
				// If tab is not active show it
				if(!$(validator.errorList[0].element).parents('.tab-pane').hasClass('active'))
					$('#form_tabs a[href="#'+ $(validator.errorList[0].element).parents('.tab-pane').attr('id') + '"]').tab('show');

				// If it's a checkbox row it might be in a category that is minimized
				if($(validator.errorList[0].element).hasClass('checkbox-row-comment'))
					$(validator.errorList[0].element).parents('.panel-collapse').collapse('show');

				$('html, body').animate({scrollTop: $(validator.errorList[0].element).offset().top-150}, 1000);
			}
			console.error(validator.errorList);

		}
	});


	

	$('input[name="ShiftId"]').rules("add", "required");
	
	$(".btn-form-next-tab").click(function(){

		// Since we want to validate just the current tab, add a temporary ignore class to any fields on the other tabs
		// This allows us total control over what jQuery validator is doing without messing with the ignore filter

		$(".tab-pane:not(.active) input, .tab-pane:not(.active) textarea, .tab-pane:not(.active) select").not(".checkbox-row").addClass("temp_ignore");

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


	workTaskLookupTemplate = Handlebars.compile($("#worktask-template").html());
	workTaskSelectedTemplate = Handlebars.compile($("#worktask-selected-template").html());

	$("#functional_task_grouping").change(function(){

		function split(a, n) {
		    var len = a.length,out = [], i = 0;
		    while (i < len) {
		        var size = Math.ceil((len - i) / n--);
		        out.push(a.slice(i, i += size));
		    }
		    return out;
		}

		$("#functional_task_grouping").addClass('loading');
		var workTaskCache = localStorage.getObject('workTasks');
		if(workTaskCache && workTaskCache[$(this).val()]){
			var splitColumns = split(workTaskCache[$(this).val()], 4);
			$("#worktask-lookup-results").html(workTaskLookupTemplate({columns: splitColumns}));
			$("#functional_task_grouping").removeClass('loading');
		}
		else{
			$.ajax({
				url: services.getSelectedL7Base() + "TaskLookup?query",
				type: 'POST',
				headers: {
					// "cache-control": "no-cache",
					"Authorization" : "Bearer "+localStorage.oauthtoken,
				},
				data: JSON.stringify({ "type": $(this).val() }),
				contentType: "application/json; charset=utf-8",
				dataType: 'JSON',
				success: function(data){
					$("#functional_task_grouping").removeClass('loading');
					var numEntries = data.d.length;
					
					

					var splitColumns = split(data.d, 4);
					$("#worktask-lookup-results").html(workTaskLookupTemplate({columns: splitColumns}));
				},
				error: function(data){
					if(data.status == 401){
						// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
						$("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
						quickLogin();
					}
					else{
						// alert('Service call failed!');
					}
					// $(department_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
				}
			});
		}
	});

	setupFacilityListener("#ReportingDepartmentFacilityId", "#ReportingDepartmentId", undefined);
	setupFacilityListener("#ResponsibleDepartmentFacilityId", "#ResponsibleDepartmentId", "#ResponsibleOfficeCode");
	setupFacilityListener("#followup_responsible_facility", "#followup_responsible_department", undefined);

	$("#ResponsibleDepartmentId").change(function(){
		// if(auditeeSupervisorSameAsAuditor){
			// $("#ReportingDepartmentId").val($(this).val());
		// }
	});
	$("#ReportingDepartmentId").change(function(){
		saveLocalAuditor();
	});
	
	function setupFacilityListener(facility_dropdown, department_dropdown, office_dropdown){
		var change_function_selector = facility_dropdown;
		if(facility_dropdown == "#ResponsibleDepartmentFacilityId")
			change_function_selector += ", input[name='AuditeeStatus']";

		$(change_function_selector).change(function(){
			
			// Special case
			// Used to bind auditee facility and auditor facility together by default
			// if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
			// 	$("#ReportingDepartmentFacilityId").val($(this).val());
			// }
			// else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
			// 	// If the auditor field was changed independantly, break the relation
			// 	auditeeSupervisorSameAsAuditor = false;
			// }

			// $(department_dropdown).html("<option disabled>Loading...</option>").addClass('loading');

			// if(localStorage.facilityResults == undefined)
			// 	localStorage.facilityResults = {};

			// if(localStorage['facilityResults' + $(this).val() + 'DepartmentResults'] == undefined)
			// 	localStorage['facilityResults' + $(this).val() + 'DepartmentResults'] = "[]";
			
			// if(localStorage['facilityResults' + $(this).val() + 'OfficeResults'] == undefined)
			// 	localStorage['facilityResults' + $(this).val() + 'OfficeResults'] = "[]";

			renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(facility_dropdown).val() + $("input[name='AuditeeStatus']:checked").val() + 'DepartmentResults'), department_dropdown);

			// Special case
			// Used to bind auditee facility and auditor facility together by default
			// if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
			// 	renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(this).val() + 'DepartmentResults'),"#ReportingDepartmentId");
			// }
			// else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
			// 	// If the auditor field was changed independantly, break the relation
			// 	auditeeSupervisorSameAsAuditor = false;
			// }

			saveLocalAuditor();

			$.ajax({
				url: services.getSelectedL7Base() + "DepartmentLookupByType?query",
				type: 'POST',
				headers: {
					// "cache-control": "no-cache",
					"Authorization" : "Bearer "+localStorage.oauthtoken,
				},
				data: JSON.stringify({ "facility": $(facility_dropdown).val(), "contractor" : $("#AuditeeStatusContractor").prop('checked') }),
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
					var currentResults = localStorage.getItem('facilityResults' + $(facility_dropdown).val() + $("input[name='AuditeeStatus']:checked").val() + 'DepartmentResults');
					var newResults = JSON.stringify(cleanedArray);

					if(currentResults !== newResults){
						console.log('Updated local storage!');

						localStorage.setObject('facilityResults' + $(facility_dropdown).val() + $("input[name='AuditeeStatus']:checked").val() + 'DepartmentResults',cleanedArray);

						renderLocalStorageFacilityResults(cleanedArray, department_dropdown);

						// Special case
						// Used to bind auditee facility and auditor facility together by default
						// if(facility_dropdown == "#ResponsibleDepartmentFacilityId" && auditeeSupervisorSameAsAuditor){
						// 	renderLocalStorageFacilityResults(cleanedArray,"#ReportingDepartmentId");
						// }
						// else if(facility_dropdown == "#ReportingDepartmentFacilityId"){
						// 	// If the auditor field was changed independantly, break the relation
						// 	auditeeSupervisorSameAsAuditor = false;
						// }
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

				renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + $(facility_dropdown).val() + 'OfficeResults'), office_dropdown);
				
				$.ajax({
					url: services.getSelectedL7Base() + "OfficeLookup?query",
					type: 'POST',
					headers: {
						// "cache-control": "no-cache",
						"Authorization" : "Bearer "+localStorage.oauthtoken,
					},
					data: JSON.stringify({ "facility": $(facility_dropdown).val() }),
					contentType: "application/json; charset=utf-8",
					dataType: 'JSON',
					context: facility_dropdown,
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
						var currentResults = localStorage.getItem('facilityResults' + $(facility_dropdown).val() + 'OfficeResults');
						var newResults = JSON.stringify(cleanedOfficeArray);

						if(currentResults !== newResults){
							console.log('Updated local storage!');

							localStorage.setObject('facilityResults' + $(facility_dropdown).val() + 'OfficeResults',cleanedOfficeArray);

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


	employeeLookupEngine = new Bloodhound({
		// name: 'employees',
		datumTokenizer: function(datum){  return datum.tokens; },
  		queryTokenizer: Bloodhound.tokenizers.whitespace,
  		limit: 100,
  		local: function(){
  			// return localStorage.getObject('employeeCache');

  			employeeCache = localStorage.getObject('employeeCache');
  			if(employeeCache){
	  			arrayVersion = [];
				var keys = Object.keys(employeeCache),
					len = keys.length,
					i = 0,
					prop,
					value;
				while (i < len) {
					arrayVersion.push(employeeCache[keys[i]]);
					i += 1;
				}
	  			return arrayVersion;
	  		}
	  		return [];
  		},
  		dupDetector: function(remoteMatch, localMatch){
  			
  			if(remoteMatch.ContactEmpid == localMatch.ContactEmpid)
  				return true;
  			return false;
  		},
		remote: {
			url: services.getSelectedL7Base() + "EmployeeLookup?query",
			ajax: {
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
			},
			replace: function(url, uriEncodedQuery){
					//empquery = uriEncodedQuery;
					return url.replace('query', uriEncodedQuery);
				},
				cache: true,
				filter:function (data) {
					var existingCache = localStorage.getObject('employeeCache');
					if(!existingCache)
						existingCache = {};
					
					var newData = [];

					$.each(data.d, function(i,emp){
						var datum = {
							value:  emp.ContactName,
							tokens: [emp.ContactName , emp.ContactEmpid],
							ContactEmpid: emp.ContactEmpid,
							ContactType: emp.ContactType,
							ContactUid: emp.ContactUid
						};

						if(emp.ContactName.indexOf("XXINACTIVE") == -1){
							newData.push(datum);
							existingCache[datum.ContactEmpid] = datum;
						}
						
					});

					// console.log(existingCache);

					localStorage.setObject('employeeCache',existingCache);


					return newData;
				}
			}
			
		});

	employeeLookupEngine.initialize();

	// var _transport = employeeLookupEngine.transport;
	// var _transportGet = _transport.get;

	// employeeLookupEngine.transport.get = function (url, ajax, handleRemoteResponse) {
	//   // $("#loadingFromServer").addClass('visible').text("Searching for employee(s)...");
	//   _transportGet.apply(_transport, arguments);
	// };

	

	$("#supervisor_of_auditee, #assignment_person, #auditor").typeahead({highlight:true},{
			name: "employees",
			source: employeeLookupEngine.ttAdapter()
		}).bind('typeahead:selected', function(obj, datum) {
			$("#" + $(this).attr('id')+"_empid").val(datum.ContactEmpid);
			$("#" + $(this).attr('id')+"_type").val(datum.ContactType);
			$("#" + $(this).attr('id')+"_uid").val(datum.ContactUid);
			

			// // If the supervisor of auditee field was modified, send the same value to the Auditor field by default
			// if($(this).attr('id') == 'supervisor_of_auditee' && auditeeSupervisorSameAsAuditor){
			// 	$("#auditor").val(datum.value);
			// 	$("#auditor_empid").val(datum.ContactEmpid);
			// 	$("#auditor_type").val(datum.ContactType);
			// 	$("#auditor_uid").val(datum.ContactUid);	
			// }
			// else if($(this).attr('id') == "auditor"){
			// 	// If the auditor was edited directly, break the supervisor of auditee -> same as auditor relation
			// 	auditeeSupervisorSameAsAuditor = false;
			// }
			if($(this).attr('id') == "auditor")
				saveLocalAuditor();

			// $(".btn-group-vendor-trend-descissue label, .btn-group-vendor-trend-desc label").removeClass('disabled');
		});




	
	if(formType == "Safety Audit"){
		var vendorLookupEngine = new Bloodhound({
		// name: 'employees',
		datumTokenizer: function(datum){  return datum.tokens; },
  		queryTokenizer: Bloodhound.tokenizers.whitespace,
  		limit: 100,
  		local: function(){
  			vendorCache = localStorage.getObject('vendorCache');
  			arrayVersion = [];
  			if(vendorCache){
				var keys = Object.keys(vendorCache),
					len = keys.length,
					i = 0,
					prop,
					value;
				while (i < len) {
					arrayVersion.push(vendorCache[keys[i]]);
					i += 1;
				}
			}
  			return arrayVersion;
  		},
  		dupDetector: function(remoteMatch, localMatch){
  			// console.log(remoteMatch, localMatch);
  			if(remoteMatch.vendor_code == localMatch.vendor_code)
  				return true;
  			return false;
  		},
		remote: {
			url: services.getSelectedL7Base() + "VendorLookup?query",
			ajax: {
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
			},
			replace: function(url, uriEncodedQuery){
					//empquery = uriEncodedQuery;
					return url.replace('query', uriEncodedQuery);
				},
				cache: true,
				filter:function (data) {
					// $("#loadingFromServer").text('Done!');
					// setTimeout(function(){$("#loadingFromServer").removeClass('visible')}, 2000);

					var existingCache = localStorage.getObject('vendorCache');
					if(!existingCache)
						existingCache = {};
					
					var newData = [];



					$.each(data.d, function(i,vendor){
						var datum = {
							value:  vendor.VendorName,
							tokens: [vendor.VendorName],
							vendor_code: vendor.VendorCode,
							vendor_suffix: vendor.VendorSuffix,
						};

						newData.push(datum);


						existingCache[datum.vendor_code] = datum;

					});

					console.log(existingCache);

					localStorage.setObject('vendorCache',existingCache);


					return newData;
				}
			}
			
		});
	

		vendorLookupEngine.initialize();
		
		

		$("#vendor_name").typeahead({highlight:true},{
				name: "vendors",
				source: vendorLookupEngine.ttAdapter()
			})

		$('#vendor_name').bind('typeahead:selected', function(obj, datum) {
			$("#vendor_code").val(datum.vendor_code);
			$("#vendor_suffix").val(datum.vendor_suffix);
			$(".btn-group-vendor-trend-issue label, .btn-group-vendor-trend-desc label").removeClass('disabled');
		});

		$(".btn-clear-textfield-typeahead-vendor").click(function(){
			$(this).parent().parent().find('input.form-control').typeahead('val', '');
			$(".btn-group-vendor-trend-issue label, .btn-group-vendor-trend-desc label").addClass('disabled').removeClass('active');
			$("#vendor_code").val('');
			$(".btn-group-vendor-trend-issue label input, .btn-group-vendor-trend-desc label input").prop("checked", false);
		});

		$(".btn-clear-textfield-typeahead").click(function(){
			$(this).parent().parent().find('input.form-control').typeahead('val', '');
		});
	}


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

	tab_id_to_object_mapping = [
		["#tab_jobarea", "Job Area Safe Zone"],
		["#tab_humanperf", "Human Perf Tools"],
		["#tab_workpractices", "Work Practices"],
		["#tab_equipment", "Equipment"],
	]

	for(i = 0; i < tab_id_to_object_mapping.length; i++){
		var tab = tab_id_to_object_mapping[i];
		if(formTabs[tab[1]] != undefined)
			$(tab[0] + " .panel-group").html(template({tabid: tab[1], myObject: formTabs[tab[1]]}));
		else{
			$("a[href='" + tab[0] +"']").parent().remove();
		}
	}

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
		// console.log('custom click function!');
		if($(this).children('input').prop('checked')){
			
			if($(this).children('input').hasClass('checkbox-row')){
				$(this).parent().parent().find('.popover').remove();

				if($(this).hasClass('active')){

					$(this).children('input').prop('checked', false);
					$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('disabled', true).prop('required', false);
					$(this).removeClass('active');

					updateCountsPanel($(this).parents('.panel-default'));

					kickoffDraftUpdateTimer();

					e.stopPropagation();
					e.stopImmediatePropagation();
					e.preventDefault();
					return;		
				}
				else{
					// $("input[name='" + $(this).children('input').attr('name') + "']");
					$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('disabled', false);
					if($(this).children('input').val() == "Below")
						$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('required', true);
					else
						$("input[name='" + $(this).children('input').attr('name') + "_comment']").prop('required', false);


					// Bug fix to prevent double click firing event from fastclick
					// $(this).children('input').addClass('needsclick');

					updateCountsPanel($(this).parents('.panel-default'));
					kickoffDraftUpdateTimer();
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

	if(formMode == "new"){
		// prevents listening for draft updates when we are just viewing a previous entry
		setupDraftUpdateEvents();
	}
	else if(formMode == "draft"){
		// delay initial event listening so the form can load completely
		// otherwise the updates get triggered immediatley on load in
		setTimeout(setupDraftUpdateEvents, 5000);
	}


	if(formMode == "view")
		loadFormEntry(get_url_parameter('viewid'));
	else if(formMode == "draft")
		loadDraft(get_url_parameter('draftid'));

	$(".css_loader_formblock").hide();
	$("#form_container").show();


	readLocalAuditor();

	FastClick.attach(document.body);
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

function saveLocalAuditor(){
	var locallyStoredAuditor = {};
	if(locallyStoredAuditor){
		locallyStoredAuditor.facilityId = $("#ReportingDepartmentFacilityId").val();
		locallyStoredAuditor.departmentId = $("#ReportingDepartmentId").val();
		locallyStoredAuditor.departmentIdName = $("#ReportingDepartmentId option:selected").text();
		locallyStoredAuditor.ContactName = $("#auditor").val();
		locallyStoredAuditor.ContactEmpid = $("#auditor_empid").val();
		locallyStoredAuditor.ContactType = $("#auditor_type").val();
		locallyStoredAuditor.ContactUid = $("#auditor_uid").val();
	}
	localStorage.setObject('auditor', locallyStoredAuditor);
}

function readLocalAuditor(){
	var locallyStoredAuditor = localStorage.getObject('auditor');
	if(locallyStoredAuditor){
		$("#ReportingDepartmentFacilityId").val(locallyStoredAuditor.facilityId);
		// $("#ReportingDepartmentId").val(locallyStoredAuditor.departmentId);
		
		renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + locallyStoredAuditor.facilityId + "E" + 'DepartmentResults'), $("#ReportingDepartmentId"));
		$("#ReportingDepartmentId").val(locallyStoredAuditor.departmentId);
		$("#auditor").val(locallyStoredAuditor.ContactName);
		$("#auditor_empid").val(locallyStoredAuditor.ContactEmpid);
		$("#auditor_type").val(locallyStoredAuditor.ContactType);
		$("#auditor_uid").val(locallyStoredAuditor.ContactUid);	
	}
}









function buildJSONObject(){
	var savedForm;

	savedForm = {
		// "__type": "Exelon.ManagementSafetyAudits.Services.ARData",
		"ARStatus": "Approved",
		"AuditeeStatus": $("input[name='AuditeeStatus']:checked").val(),
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
		"PhaseCleanup": $("#PhaseCleanup").is(":checked"),
		"PhaseExecution": $("#PhaseExecution").is(":checked"),
		"PhaseSetup": $("#PhaseSetup").is(":checked"),
		"PlanId": $("input[name='PlanId']:checked").val(),
		"ProblemDescription": $("#overall_comments").val(),
		"ReportingDepartmentFacilityId": $("#ReportingDepartmentFacilityId").val(),
		"ReportingDepartmentId": $("#ReportingDepartmentId").val(),
		"ResponsibleDepartmentFacilityId": $("#ResponsibleDepartmentFacilityId").val(),
		"ResponsibleDepartmentId": $("#ResponsibleDepartmentId").val(),
		"ResponsibleOfficeCode": $("#ResponsibleOfficeCode").val(),
		"ShiftId": $("input[name='ShiftId']:checked").val(),
		"WeatherConditionsX": $(".weather-conditions-group input:checked").map(function(){ return $(this).val().trim(); }).get(),
		// "org_number_auditee": $("#org_number_auditee").val(),
	};

	if(formMode == "edit"){
		savedForm.ARID = $("#arnumber").val();
	}
	if(formType !== "Peer to Peer"){
		savedForm.SupervisorManagerX = {
			// "__type": "Exelon.ManagementSafetyAudits.Services.ARContact",
			"ContactEmpid": $("#supervisor_of_auditee_empid").val(),
			"ContactName": $("#supervisor_of_auditee").val(),
			"ContactType": $("#supervisor_of_auditee_type").val(),
			"ContactUid": $("#supervisor_of_auditee_uid").val(),
		}
	}
	if($("input[name='WorkTasks[]']").length > 0){
		savedForm.WorkTasksX = $("input[name='WorkTasks[]']").map(function(){ return $(this).val() }).get();
	}
	if($("#vendor_name").val() != null && $("#vendor_name").val().length > 0){
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
	savedForm.EquipmentConditionsX = buildCheckboxEntries("#tab_equipment");
	savedForm.JobAreaSafeZonesX = buildCheckboxEntries("#tab_jobarea");
	savedForm.WorkPracticesSkillsX = buildCheckboxEntries("#tab_workpractices");


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

	if(formMode == "new" || formMode == "draft"){

		$('#myModal').modal({backdrop: 'static'});
		
		$("#myModal .modal-header button").hide();
		$("#myModal .modal-footer").hide();

		$("#myModal .modal-title").text("Submitting New Audit");
		$("#myModal .modal-body").html("Please wait, this can take a while... <div class='css_loader'><div>Loading…</div></div>");

		$.ajax({
			url: services.getSelectedL7Base() + "SubmitAR",
			type: 'POST',
			headers: {
				"cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({"auditData": savedForm}),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			success: function(data){
				

				if(isNumber(data.d)){
					var returnedARID = data.d;

					$("#myModal .modal-body").text("Success! The new AR ID is " + returnedARID);	
					$("#newARID").text(returnedARID);
					$("#reload_submitted_audit").attr('href', "bootstrap-form.html?viewid=" + returnedARID);
					deleteDraft();

					draftsDB.getDrafts(function(drafts){
						if(drafts.length == 0){
							$("#next_draft").hide();
						}
						else{
							$("#next_draft").show();
							var draft = drafts[0];

							if(draft.type == "Driver Audit")
								draft.formlink = "form-driver.html?"
							else if (draft.type == "Safety Audit")
								draft.formlink = "bootstrap-form.html?"
							else if (draft.type == "Peer to Peer")
								draft.formlink = "bootstrap-form.html?type=peertopeer&"

							$("#next_draft_button").attr('href', draft.formlink + "draftid=" + draft.id);

						}
					});

					if(pictureURI != undefined && pictureURI != ""){
						$("#myModal .modal-body").append("<br>Uploading photo");
						uploadPhoto(returnedARID);
					}
					else{
						$('#myModal').modal('hide');
						$("form#safetyaudit").hide();
						$("#success_screen").show();
					}
					
					submitted = true;
				}
				else{
					console.log(data);
					$("#myModal .modal-body").text("Error! " + data.d);
					$("#myModal .modal-header button").show();
					$("#myModal .modal-footer").show();	
				}
				
			},
			error: function(data){
				console.error(data);
				if(data.status == 401){
					//alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					$("#myModal .modal-body").text("Your login may have expired, please reenter your login details to continue, then try saving again.");
				}
				else if(data.status >= 200 && data.status < 501){
					$("#myModal .modal-body").text('Form failed to save. The error returned was: ' + data.responseText);
				}
				else{
					$("#myModal .modal-body").text('No connection to the server! This form has been saved to your drafts, but you will not be able to submit until the server is accessible again.');
				}
				
				$("#myModal .modal-header button").show();
				$("#myModal .modal-footer").show();	
			}
		});
	} else if(formMode == "edit"){
		
		$('#myModal').modal({backdrop: 'static'});
		
		$("#myModal .modal-header button").hide();
		$("#myModal .modal-footer").hide();

		$("#myModal .modal-title").text("Updating Audit");
		$("#myModal .modal-body").html("Please wait, this can take a while... <div class='css_loader'><div>Loading…</div></div>");

		$.ajax({
			url: services.getSelectedL7Base() + "UpdateAR",
			type: 'POST',
			headers: {
				"cache-control": "no-cache",
				"Authorization" : "Bearer "+localStorage.oauthtoken,
			},
			data: JSON.stringify({"auditData": savedForm}),
			contentType: "application/json; charset=utf-8",
			dataType: 'JSON',
			success: function(data){
				
				if(data.d == true){
					
					$("#myModal .modal-body").text("Success! The audit has been updated.");	
					// $("#newARID").text(returnedARID);
					// $("#reload_submitted_audit").attr('href', "bootstrap-form.html?viewid=" + returnedARID);
					
					draftsDB.getDrafts(function(drafts){
						if(drafts.length == 0){
							$("#next_draft").hide();
						}
						else{
							$("#next_draft").show();
							var draft = drafts[0];

							if(draft.type == "Driver Audit")
								draft.formlink = "form-driver.html?"
							else if (draft.type == "Safety Audit")
								draft.formlink = "bootstrap-form.html?"
							else if (draft.type == "Peer to Peer")
								draft.formlink = "bootstrap-form.html?type=peertopeer&"

							$("#next_draft_button").attr('href', draft.formlink + "draftid=" + draft.id);

						}
					});

					if(pictureURI != undefined && pictureURI != ""){
						$("#myModal .modal-body").append("<br>Uploading photo");
						uploadPhoto(returnedARID);
					}
					else{
						$('#myModal').modal('hide');
						$("form#safetyaudit").hide();
						$("#success_screen").show();
						$("#success_screen_text").text("Audit Updated");
						$("#newARID").parent().remove();
						$("#reload_submitted_audit").attr('href', "bootstrap-form.html?viewid=" + get_url_parameter('viewid'));

					}
					
					submitted = true;
				}
				else{
					console.log(data);
					$("#myModal .modal-body").text("Error! " + data.d);
					$("#myModal .modal-header button").show();
					$("#myModal .modal-footer").show();		
				}
				
			},
			error: function(data){
				console.error(data);
				if(data.status == 401){
					//alert('Unauthorized! Your login may have expired. Please logout and log back in.')
					$("#myModal .modal-body").text("Your login may have expired, please reenter your login details to continue, then try saving again.");
					delete localStorage.oauthtoken;
					checkOfflineStatus();
					// $("#myModal").modal('hide');
					// quickLogin();
				} else if(data.status >= 200 && data.status < 402){
					$("#myModal .modal-body").text('Form failed to save. The error returned was: ' + data.responseText);
				} else{
					$("#myModal .modal-body").text('No connection to the server! This form has been saved to your drafts, but you will not be able to submit until the server is accessible again.');
				}
				
				$("#myModal .modal-header button").show();
				$("#myModal .modal-footer").show();	
			}
		});
	}
}



function loadJSONFormObject(formObject){
	// $("#AuditeeStatus").val(formObject.AuditeeStatus);
	processBtnGroupRadio("input[name='AuditeeStatus']", formObject.AuditeeStatus);
	$("#auditor_empid").val(formObject.AuditorX.ContactEmpid);
	$("#auditor").val(formObject.AuditorX.ContactName);
	$("#auditor_type").val(formObject.AuditorX.ContactType);
	$("#auditor_uid").val(formObject.AuditorX.ContactUid);

	if(formObject.EventDate != undefined){
		
		document.getElementById('EventDate').valueAsDate = moment(formObject.EventDate, ["MM/DD/YYYY", "YYYY-MM-DD"]).format("X")*1000;

	}
	$("#EventTime").val(formObject.EventTime);
	$("#GeoLocation").val(formObject.GeoLocation);
	if(formObject.GeoLocation != ""){
		$("#btn_show_on_map").attr('href','maps:ll=' + formObject.GeoLocation.replace(/\s/g, ''));
	}
	else{
		$("#btn_show_on_map").hide();
	}

	$("#overall_comments").val(formObject.ProblemDescription).trigger('keyup');


	$("#ReportingDepartmentFacilityId").val(formObject.ReportingDepartmentFacilityId);
	$("#ResponsibleDepartmentFacilityId").val(formObject.ResponsibleDepartmentFacilityId);

	renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + formObject.ReportingDepartmentFacilityId + $("input[name='AuditeeStatus']:checked").val() + 'DepartmentResults'), $("#ReportingDepartmentId"));
	renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + formObject.ResponsibleDepartmentFacilityId + $("input[name='AuditeeStatus']:checked").val() + 'DepartmentResults'), $("#ResponsibleDepartmentId"));
	renderLocalStorageFacilityResults(localStorage.getObject('facilityResults' + formObject.ResponsibleDepartmentFacilityId + 'OfficeResults'), $("#ResponsibleOfficeCode"));
				
	$("#ReportingDepartmentId").val(formObject.ReportingDepartmentId);
	$("#ResponsibleDepartmentId").val(formObject.ResponsibleDepartmentId);
	$("#ResponsibleOfficeCode").val(formObject.ResponsibleOfficeCode);
	// $("#ReportingDepartmentId").html("<option selected>" + formObject.ReportingDepartmentId + "</option>");
	// $("#ResponsibleDepartmentId").html("<option selected>" + formObject.ResponsibleDepartmentId + "</option>");
	// $("#ResponsibleOfficeCode").html("<option selected>" + formObject.ResponsibleOfficeCode + "</option>");

	if(formObject.SupervisorManagerX){
		$("#supervisor_of_auditee_empid").val(formObject.SupervisorManagerX.ContactEmpid);
		$("#supervisor_of_auditee").val(formObject.SupervisorManagerX.ContactName);
		$("#supervisor_of_auditee_type").val(formObject.SupervisorManagerX.ContactType);
		$("#supervisor_of_auditee_uid").val(formObject.SupervisorManagerX.ContactUid);
	}

	$("#org_number_auditee").val(formObject.org_number_auditee);

	processBtnGroupCheckbox("#IsNearMiss", formObject.IsNearMiss);
	processBtnGroupCheckbox("#PhaseCleanup", formObject.PhaseCleanup);
	processBtnGroupCheckbox("#PhaseExecution", formObject.PhaseExecution);
	processBtnGroupCheckbox("#PhaseSetup", formObject.PhaseSetup);

	processBtnGroupRadio("input[name='PlanId']", formObject.PlanId);
	processBtnGroupRadio("input[name='ShiftId']", formObject.ShiftId);

	// 0(formObject);

	for(var i = 0; i < formObject.WeatherConditionsX.length; i ++){
		$(".weather-conditions-group input[value='" + formObject.WeatherConditionsX[i] + "']").click();
	}

	if(formObject.WorkTasksX != undefined && formObject.WorkTasksX.length > 0){
		$("#worktask-nothing-selected").hide();
		workTasksSelected = {};
		for(var i = 0; i < formObject.WorkTasksX.length; i ++){
			// $(".weather-conditions-group input[value='" + formObject.WeatherConditionsX[i] + "']").click();
			workTasksSelected[i] = {TaskName: formObject.WorkTasksX[i], TaskCode: i};
		}
		$("#worktask-selected-tbody").append(workTaskSelectedTemplate({tasks: workTasksSelected}));
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

			if(data[i].TCRank == "Below")
				$(comment_selector).prop('required', true);
			console.log(data[i]);
			// console.log(selector);
		}	
	}
	
	readInCheckboxRows("#tab_jobarea", formObject.JobAreaSafeZonesX);
	readInCheckboxRows("#tab_humanperf", formObject.HumanPerformanceToolsX);
	readInCheckboxRows("#tab_workpractices", formObject.WorkPracticesSkillsX);
	readInCheckboxRows("#tab_equipment", formObject.EquipmentConditionsX);
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

	if(formObject.FollowupAssignmentX != undefined && formObject.FollowupAssignmentX.AssignmentSubject != undefined && formObject.FollowupAssignmentX.AssignmentSubject != ""){
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





function kickoffDraftUpdateTimer(){
	if(formMode != "edit"){
		if(draftSavetimer != null){
			clearTimeout(draftSavetimer);
		}
		$("#draftAlert").addClass('visible').text('Unsaved changes');
		draftSavetimer = setTimeout(function(){
			updateDraft();
			$("#draftAlert").text('Saving Draft');
			setTimeout(function(){$("#draftAlert").removeClass('visible')}, 2000);
		}, 5000);
	}
}

function setupDraftUpdateEvents(){
	$("form#safetyaudit input, form#safetyaudit select, form#safetyaudit textarea").change(function(){
		kickoffDraftUpdateTimer();
	});
}

function updateDraft(callback){
	console.log("Updating draft!");
	draftsDB.updateWorkingDraft(buildJSONObject(), formType, "TODO: Fill this in!", callback);
}

function loadDraft(draftid){
	$('#myModal').modal('show');
	$("#myModal .modal-title").text("Loading draft");
	$("#myModal .modal-body").text("Loading the draft...");
	draftsDB.setCurrentDraftID(draftid);
	draftsDB.getDraft(draftid, function(jsonData){
		console.log("Reading in draft");
		loadJSONFormObject(jsonData);
		$("#myModal .modal-body").text("Success!");
		setTimeout("$('#myModal').modal('hide');", 1000);
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
	// Reset all in the group, then activate the right one
	$(id).prop('checked', false).parent('label.btn-toggle').removeClass('active');
	$(id+"[value='" + value + "']").prop('checked', true).parent('label.btn-toggle').addClass('active');
}


function changeToViewOnly(){
	$("#viewing_entry_warning").show();

	if($("#vendor_name").val() == "")
		$("#vendor_section .row").html("<div class='col-md-12'>No vendor issues were specified.</div>");
	
	if($("#GeoLocation").val() == "")
		$("#GeoLocation").after("No location data was specified.");

	if($("#IsNearMiss").is(":checked")){
		$("#IsNearMiss").parent().removeClass('checkbox');
		$("#IsNearMiss").remove();
	}
	else{
		$("#IsNearMiss").parent().remove();
	}

	if($("#followup_tracked_in_passport").is(":checked")){
		$("#followup_tracked_in_passport").parent().removeClass('btn btn-default');
		$("#followup_tracked_in_passport").remove();
	}
	else
		$("#followup_tracked_in_passport").parent().remove();

	// $("#EventDate").after($("#EventDate").val()).remove();

	$("#EventDate").after(moment($("#EventDate").val() + " " + $("#EventTime").val()).format('MMMM Do YYYY, h:mm a'));


	$("#EventDate, #EventTime").remove();

	if($("#followup_duedate").val() != ""){
		
		$("#followup_duedate").after(moment($("#followup_duedate").val()).format('MMMM Do YYYY'));
		$("#followup_duedate").remove();
	}
	$("form#safetyaudit input:text, textarea").each(function(){ $(this).after("<p>" + $(this).val() + "</p>").remove(); });
	$("form#safetyaudit select").each(function(){ $(this).after("<p>" + $(this).val() + "</p>").remove() });
	$("form#safetyaudit .btn-group label:not('.active')").remove();
	$("form#safetyaudit .character-count").remove();
	$("form#safetyaudit #photo_buttons").remove();
	$("form#safetyaudit .worktask-selected-row .btn").remove();
	$("form#safetyaudit .btn-clear-textfield-typeahead, .btn-clear-textfield-typeahead-vendor").remove();
	$("form#safetyaudit .btn-group label.active").each(function(){ $(this).after($(this).text()).remove(); });
	$("form#safetyaudit #btn_use_device_gps").remove();
	$('form#safetyaudit #input').prop('disabled',true)
	$("form#safetyaudit input:submit").remove();
	$("#lookup-work-tasks-button").hide();

	


	var weather_conditions_string = "";
	$(".weather-conditions-group input:checked").each(function(){ weather_conditions_string += "<li>" + $(this).parent().text() + "</li>"; });
	if(weather_conditions_string != ""){

		$(".weather-conditions-group").html("<ul>" + weather_conditions_string + "</ul>");	
	}
	
	else{
		$(".weather-conditions-group").html("No weather conditions were specified.");	
	}

}
function loadFormEntry(id){
	$('#myModal').modal({backdrop: 'static'});
	$("#myModal .modal-title").text("Loading Audit");
	$("#myModal .modal-body").html("Loading the saved form... <div class='css_loader'><div>Loading…</div></div>");
	$("#form_type_name").append(" - Viewing AR " + id);
	
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

			
			
			if(parseInt(data.d.ARStatus) > 20 ){
				changeToViewOnly();
			} else if(data.d.ARStatus == "20"){
				$("#viewing_entry_warning").show();
				$("#viewing_entry_warning p").text("This is a previously submitted entry, you may edit and submit any changes. Drafts will not be saved.");
				$("#arnumber").val(id);
				formMode = "edit";
			}
			
			// $("#EventDate").after("<p>" + $(this).val() + $("#EventTime").val() + "</p>").remove();
			// $("#EventTime").remove();


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
			
			if(data.status >= 200 && data.status < 402){
				$("#myModal .modal-body").text('Form failed to load. The error returned was: ' + data.responseText);
			}
			else{
				$("#myModal .modal-body").text('No connection to the server! Please try the connectivity test in the settings page, and try again when connectivity is restored.');
			}
			
			
			$("#myModal .modal-header button").show();
			$("#myModal .modal-footer").show();	
			$("#myModal .modal-body").text('Form failed to load. The error returned was: ' + data.responseText);
		}
	});
}







function onGPSSuccess(position) {
	$("#GeoLocation").val(position.coords.latitude + ", " + position.coords.longitude);
	$("#btn_show_on_map").attr('href','maps:ll=' + position.coords.latitude + "," + position.coords.longitude);
}

function onGPSError(error) {
	alert('code: '    + error.code    + '\n' +	'message: ' + error.message + '\n');
}






var pictureURI;
var lat = "";
var lng = "";



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

	$('#myModal').modal('hide');

	$("form#safetyaudit").hide();
	$("#success_screen").show();
	
}

function fail(error) {
	alert("An error has occurred: Code = " + error.code);
	console.log("upload error source " + error.source);
	console.log("upload error target " + error.target);

}





































