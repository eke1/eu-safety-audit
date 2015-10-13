var services = {
	endpoints: { 
		environments:{
			Dev: {
				'L7' : 'https://int-soaext.constellation.com/safetyar/'
			},
			Stage: {
				'L7' : 'https://int-soaext.constellation.com/safetyarqa/'
			},
			Production: {
				'L7':  'https://soaext.constellation.com/safetyar/'
			},
		},
		Login:{
			/*'L7 Internal Store': {
				'URL': 'https://soaext-msw.constellation.com/auth/oauth/v2/token2',
				'ClientID': 'b46b5587-b3be-4c01-95b9-40d9c60aef19',
			},*/
			'Exelon DS' : {
				'URL': 'https://int-soaext.constellation.com/auth/oauth/v2/token2',
				'ClientID': 'b46b5587-b3be-4c01-95b9-40d9c60aef19',
			},
			'Production': {
				'URL': 'https://soaext.constellation.com/auth/oauth/v2/token2',
				'ClientID': 'c8bcf79e-04f8-4b08-8689-d0aec5c88df8',
			}
		},	
	},
	getSelectedL7Base : function(){
		return this['endpoints']['environments'][localStorage.services]['L7'];
	},
	getSelectedLoginURL : function(){
		return this['endpoints']['Login'][localStorage.services_login];
	},
	initialize : function(){
		// set defaults
		if(localStorage.services == undefined)
			localStorage.services = 'Production';

		if(localStorage.services_login == undefined)
			localStorage.services_login = 'Production';
	},
	getOptionsforLogin: function(){
		return Object.keys(this['endpoints']['Login']);
	},
	getOptionsforEnvironments: function(){
		return Object.keys(this['endpoints']['environments']);
	},
	setLoginEndpoint: function(option){
		localStorage.services_login = option;
	},
	setEnvironment: function(option){
		localStorage.services = option;
	},
	getSelectedEvironmentEndpoint: function(){
		return localStorage.services;
	},
	getSelectedLoginEndpoint: function(){
		return localStorage.services_login;
	},
}

services.initialize();

