var loginHandler = {
	login: function(options) {
		if (options.username.toUpperCase().indexOf('GEN_') == 0) {
			if (options.error != null) {
				options.error(null, 'Login failed. Please use your Exelon DS login (E or C number)', null);
			}
		} else {
			var tokenRequest = {
				"grant_type": "password",
				"username": options.username,
				"password": options.password,
					
				"scope" : "iPadDemo",
				"client_id" : services.getSelectedLoginURL()['ClientID']
			};
				
			$.ajax({
				url: services.getSelectedLoginURL()['URL'],
				type: 'POST',
				headers: {
					"cache-control": "no-cache",
					"Content-Type": "application/x-www-form-urlencoded"
				},
				data: tokenRequest,
				contentType: "application/json; charset=utf-8",
				
				success:function (data) {
					localStorage.oauthtoken = data.access_token;
					localStorage.loggedinusername = options.username;
				   // window.location.href = "bootstrap-form.html";
				   if (options.success != null) {
				   	options.success();
				   }
				},
				error: function (xhr, textStatus, errorThrown) {
					
					delete localStorage.oauthtoken;
					delete localStorage.loggedinusername;
					if (options.error != null) {
						options.error(xhr, textStatus, errorThrown);
					}
				}
			});
		}
	}
}