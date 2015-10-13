function quickLogin(){
	if($("#quick_login_username").val() != undefined && $("#quick_login_username").val().length > 0 && $("#quick_login_password").val() != undefined && $("#quick_login_password").val().length > 0 ){

		$("#quick_login_loginbutton").button('loading');

		loginHandler.login({
			username: $("#quick_login_username").val(), 
			password: $("#quick_login_password").val(),
			success: function(){
				$("#quickLogin .modal-body").text("Success!");
				checkOfflineStatus();
				setTimeout(function(){$('#quickLogin').modal('hide')}, 1000);
			},
			error: function(xhr, textStatus, errorThrown){
				$("#quick_login_loginbutton").button('reset');

				if (xhr == null) {
					$("#loginerror").fadeIn().text(textStatus);
				} else if (xhr.status >= 200 && xhr.status < 402) {
					alert('Login failed, please check the username and password');
				} else {
					alert('No connection to the server! You may proceed to work offline, but you will not be able to submit until the server is accessible again.');
				}

				// alert("Login Failed! If you are in the G&E building, you may need to turn off Wi-Fi on your device.");				
			}
		});
		

	} else {
		// testAnim('shake');
		$('#quickLogin').removeClass('animated shake').addClass('animated shake');
		var wait = window.setTimeout( function(){
			$('#quickLogin').removeClass('animated shake')},
			1300
			);
		console.log('failed validation');
	}
}

// Fires off a service request to the fastest/smallest service to test if the oauth token has been deauthorized
function checkOuathTokenStatus(){
	$.ajax({
		url: services.getSelectedL7Base() + "DepartmentLookup?query",
		type: 'POST',
		headers: {
			"Authorization" : "Bearer "+localStorage.oauthtoken,
		},
		data: JSON.stringify({ "facility": "BSC" }),
		contentType: "application/json; charset=utf-8",
		dataType: 'JSON',
		context: this,
		success: function(data){
			// Do nothing, oauth token is still valid
			checkOfflineStatus();
		},
		error: function(data){
			// if(data.status == 401){
			// 	// alert('Unauthorized! Your login may have expired. Please logout and log back in.')
			// 	// $("#quick_login_reason").text("Your login may have expired, please reenter your login details to continue");
			// 	// quickLogin();
				
			// }
			// else{
			// 	// alert('Service call failed! Using cached values if available...');
			// }
			if(data.status == 0){
				$('.offline_status').html("Connectivity issues! Please check for an active network connection before logging in. <button class='btn btn-primary btn-block' data-toggle='modal' data-target='#quickLogin'>Login</button>");
				$("#loginerror").text("Potential connectivity issues detected. You may try logging in, or you can work offline.").show();

			}
			console.log("Unauthorized! Clearing token");
			delete localStorage.oauthtoken;
			checkOfflineStatus();
			// $(department_dropdown).removeClass('loading').html("<option disabled>Loading Failed!</option>");
		}
	});
}
function checkOfflineStatus(){
	if(localStorage.oauthtoken == undefined){
		$("#logout_link").hide();
		$("#offline_warning").show();
		return false;
	}
	else{
		$("#logout_link").show();
		$("#offline_warning").hide();
		$("nav .offline_status").hide();
		$("nav .logged_in_as").text("Logged in as " + localStorage.loggedinusername).show();
		return true;
	}
}


$(function() {

	$("#help_link").click(function(){
		$("#help_text").show();
	});
	
	$("#nav-open-btn").click(function(){
		$("#main").toggleClass('shownav').addClass('haveanim');
	});

	checkOfflineStatus();
	checkOuathTokenStatus();


	$("#quick_login_loginbutton").click(function(){
		quickLogin();
	});

	if(services.getSelectedLoginEndpoint() == "L7 Internal Store" || services.getSelectedLoginEndpoint() == "Production" )
		$("#quick_login_statement").text("Please use your Exelon DS user ID & password, or a Layer 7 account");
	else if(services.getSelectedLoginEndpoint() == "Exelon DS")
		$("#quick_login_statement").text("Please use your Exelon DS login (E or C number)");


	draftsDB.getDraftsCount(function(count){
		if(count == 0)
			$("#drafts_count").hide();
		else
			$("#drafts_count").text(count);
	})

	/**
	 * requestAnimationFrame and cancel polyfill
	 */
	 var lastTime = 0;
	 var vendors = ['ms', 'moz', 'webkit', 'o'];
	 for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
	 	window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
	 	window.cancelAnimationFrame =
	 	window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	 }

	 if (!window.requestAnimationFrame)
	 	window.requestAnimationFrame = function(callback, element) {
	 		var currTime = new Date().getTime();
	 		var timeToCall = Math.max(0, 16 - (currTime - lastTime));
	 		var id = window.setTimeout(function() { callback(currTime + timeToCall); },
	 			timeToCall);
	 		lastTime = currTime + timeToCall;
	 		return id;
	 	};

	 	if (!window.cancelAnimationFrame)
	 		window.cancelAnimationFrame = function(id) {
	 			clearTimeout(id);
	 		};
	 	}());


	/**
	 * Based on pull to refresh demo
	 * @type {*}
	 */
	 var PullForMenu = (function() {
	 	function Main(container, slidebox, slidebox_icon, handler) {
	 		var self = this;

	 		this.breakpoint = 80;

	 		this.container = container;
	 		this.slidebox = slidebox;

	 		this.slidebox_icon = slidebox_icon;
	 		this.handler = handler;

	 		this._slideright_offset = 0;
	 		this._slideleft_offset = 0;
	 		this._anim = null;
	 		this._dragged_right = false;
	 		this._dragged_left = false;
	 		this._ignore_drag = false;
	 		this._is_open = false;
	 		this.hammertime = Hammer(this.container)
	 		.on("touch release dragright dragleft dragup dragdown", function(ev) {
	 			self.handleHammer(ev);
	 		});

			// removed: dragright dragleft dragup dragdown 
		};


		/**
		 * Handle HammerJS callback
		 * @param ev
		 */
		 Main.prototype.handleHammer = function(ev) {
		 	var self = this;

		 	switch(ev.type) {
				// reset element on start
				case 'touch':
						// if(this._is_open)
						// this.hide();
						break;

				// on release we check how far we dragged
				case 'release':

					if(!this._ignore_drag){

						// cancel animation
						cancelAnimationFrame(this._anim);
						this._anim = null;
						$(this.slidebox).addClass('haveanim');
						// over the breakpoint, trigger the callback
						if(ev.gesture.deltaX >= this.breakpoint) {
							// container_el.className = 'pullrefresh-loading';
							// pullrefresh_icon_el.className = 'icon loading';

							// this.setOffset(300);
							this.setOffset(null);
							$(this.slidebox).addClass('shownav');
							
							this._is_open = true;
							// this.handler.call(this);
						}
						// just hide it
						else {
							// pullrefresh_el.className = 'slideup';
							// container_el.className = 'pullrefresh-slideup';
							$(this.slidebox).removeClass('shownav');
							this.setOffset(null)
							this.hide();
							this._is_open = false;
							ev.gesture.preventDefault();
							ev.gesture.stopPropagation();
						}
					}
					this._dragged_left = false;
					this._dragged_right = false;
					this._ignore_drag = false;
					break;

				// when we dragright
				case 'dragright':
					// if dragleft has already been started for this gesture, don't process this.
					if(this._dragged_left || this._ignore_drag)
						return;

					// We only want the menu to come out if the user taps + drags in the left 20% of the screen
					// Reduces accidental drags
					if(ev.gesture.srcEvent.pageX/window.innerWidth > .2 && !this._dragged_right){
						this._ignore_drag = true;
						return;
					}

					this._dragged_right = true;
					this._dragged_left = false;

					if(this._is_open){
						// stop browser scrolling
						ev.gesture.preventDefault();
						return;
					}


					// no requestAnimationFrame instance is running, start one
					if(!this._anim) {
						$(this.slidebox).removeClass('haveanim');
						this.updateOffset();
					}

					// stop browser scrolling
					ev.gesture.preventDefault();

					// update slidedown height
					// it will be updated when requestAnimationFrame is called
					this._slideright_offset = ev.gesture.deltaX;
					if(this._slideright_offset > 300){
						this._slideright_offset = 300;
					}
					console.log(this._anim, this._slideright_offset, ev.gesture);
					break;
				case 'dragleft':
					// if dragright has already been started for this gesture, don't process this.
					if(this._dragged_right || this._ignore_drag)
						return;

					if(!this._is_open)
						return;

					this._dragged_left = true;
					this._dragged_right = false;


					if(!this._anim  ) {
						$(this.slidebox).removeClass('haveanim').removeClass('shownav');
						this.updateOffset();
					}


					// stop browser scrolling
					ev.gesture.preventDefault();

					// update slidedown height
					// it will be updated when requestAnimationFrame is called
					this._slideright_offset = 300+ev.gesture.deltaX;
					
					if(this._slideright_offset < 0){
						this._slideright_offset = 0;
					}
					console.log(this._anim, this._slideright_offset, ev.gesture);
					
					break;

				case 'dragup':
					if(!this._dragged_right && !this._dragged_left)
						this._ignore_drag = true;
					break;
				case 'dragdown':
					if(!this._dragged_right && !this._dragged_left)
						this._ignore_drag = true;
					break;

				}
			};


		/**
		 * when we set the height, we just change the container y
		 * @param   {Number}    height
		 */
		 Main.prototype.setOffset = function(offset) {
		 	var fixedoffset = offset; 
		 	if(offset == null){
		 		$(this.slidebox).attr('style', '');

		 	}
		 	else{
		 		if(Modernizr.csstransforms3d) {
		 			this.slidebox.style.transform = 'translate3d('+fixedoffset+'px,0,0) ';
		 			this.slidebox.style.oTransform = 'translate3d('+fixedoffset+'px,0,0)';
		 			this.slidebox.style.msTransform = 'translate3d('+fixedoffset+'px,0,0)';
		 			this.slidebox.style.mozTransform = 'translate3d('+fixedoffset+'px,0,0)';
		 			this.slidebox.style.webkitTransform = 'translate3d('+fixedoffset+'px,0,0) scale3d(1,1,1)';
		 		}
		 		else if(Modernizr.csstransforms) {
		 			this.slidebox.style.transform = 'translate('+fixedoffset+'px,0) ';
		 			this.slidebox.style.oTransform = 'translate('+fixedoffset+'px,0)';
		 			this.slidebox.style.msTransform = 'translate('+fixedoffset+'px,0)';
		 			this.slidebox.style.mozTransform = 'translate('+fixedoffset+'px,0)';
		 			this.slidebox.style.webkitTransform = 'translate('+fixedoffset+'px,0)';
		 		}
		 		else {
		 			this.slidebox.style.left = fixedoffset+"px";
		 		}
		 	}
		 };


		 Main.prototype.hide = function() {
				// container_el.className = '';
				this._slideright_offset = 0;
				// this.setOffset(0);
				cancelAnimationFrame(this._anim);
				this._anim = null;
				// this._dragged_right = false;
			};



		 Main.prototype.updateOffset = function() {
		 	var self = this;
		 	this.setOffset(this._slideright_offset);
			this._anim = requestAnimationFrame(function() {
				self.updateOffset();
			});
		};

			return Main;
		})();



	function getEl(id) {
		return document.getElementById(id);
	}

	var touch_container_el = getEl('main-content');
	var scroll_container_el = getEl('main');
	var pullrefresh_el = getEl('pullrefresh');
	var pullrefresh_icon_el = getEl('pullrefresh-icon');
	var image_el = getEl('random-image');


	// var MainMenu = {_is_open: true};
	var MainMenu = new PullForMenu(touch_container_el, scroll_container_el, pullrefresh_icon_el);

	// http://tokenposts.blogspot.com.au/2012/04/javascript-objectkeys-browser.html
	if (!Object.keys) Object.keys = function(o) {
		if (o !== Object(o))
			throw new TypeError('Object.keys called on a non-object');
		var k=[],p;
		for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
			return k;
	}

	Storage.prototype.setObject = function(key, value) {
		this.setItem(key, JSON.stringify(value));
	}

	Storage.prototype.getObject = function(key) {
		var value = this.getItem(key);
		return value && JSON.parse(value);
	}



	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	}

	// get URL parameter function
	function get_url_parameter( name ){
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");  
		var regexS = "[\\?&]"+name+"=([^&#]*)";  
		var regex = new RegExp( regexS );  
		var results = regex.exec( window.location.href ); 
		if( results == null )
			return null;  
		else
			return results[1];
	}


	function isNumber(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}