$.validator.setDefaults({
	errorPlacement: function(error,element) {
		// if(element.parent().hasClass('btn')){
		// 	error.appendTo(element.parent().parent());
		// 	return false;
		// }
		return true;
	},
	highlight: function (element, errorClass, validClass) {
		var $element;
		if (element.type === 'radio') {
			$element = this.findByName(element.name);
		} else {
			$element = $(element);
		}
		$element.addClass(errorClass).removeClass(validClass);
		$element.parents("div.form-group").addClass("has-error");
	},
	unhighlight: function (element, errorClass, validClass) {
		var $element;
		if (element.type === 'radio') {
			$element = this.findByName(element.name);
		} else {
			$element = $(element);
		}
		$element.removeClass(errorClass).addClass(validClass);
		$element.parents("div.form-group").removeClass("has-error");

		if($element.parent().hasClass('btn')){
			$element.parent().popover('hide');
		}
		else if($element.data('error-selector')){
			$($element.data('error-selector')).popover('hide');
		}
		else
			$element.popover('hide');
	},
	showErrors: function (errorMap, errorList) {

		$.each(this.successList, function (index, value) {
			// console.log('hiding' + value)
			$($(value.element).data('error-selector')).popover('hide');
			$(value).popover('hide');
		});

		$.each(errorList, function (index, value) {
			var target = value.element;
			var error_selector = $($(value.element).data('error-selector'));
			if(error_selector.length)
				target = error_selector;
			if($(value.element).parent().hasClass('btn')){
				target = $(value.element).parent();
			}
			// console.log(target);
			if($(target).is(":visible")){
				var pop = $(target).popover({
					trigger: 'manual',
					content: value.message,
					placement: 'auto bottom',
					template: '<div class="popover"><div class="arrow"></div><div class="popover-inner"><div class="popover-content"><p></p></div></div></div>'
				}).show();

				//pop.data('popover').options.content = value.message;

				pop.popover('show');
			}

		});

		this.defaultShowErrors();
	}
});
