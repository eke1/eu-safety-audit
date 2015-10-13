
// draftsDB = window.openDatabase("drafts", "1.0", "Drafts DB", 1000000);
// draftsDB.transaction(populateDraftsDB, errorCB, successCB); 






var draftsDB_setup = (function() {
	function Main() {
		this.db = window.openDatabase("drafts", "1.0", "Drafts DB", 1000000);
		this.db.transaction(this._populateDraftsDB, this._errorCB, this._successCB);
		// this.current_draftid = null;
	}

	Main.prototype._populateDraftsDB = function(tx) {
	    // tx.executeSql('DROP TABLE IF EXISTS DRAFTS');
	    tx.executeSql('CREATE TABLE IF NOT EXISTS DRAFTS (id INTEGER PRIMARY KEY AUTOINCREMENT, dateceated, datemodified, type, auditor, facility, department, description, data)');
	    // tx.executeSql('INSERT INTO DEMO (id, data) VALUES (1, "First row")');
	    // tx.executeSql('INSERT INTO DEMO (id, data) VALUES (2, "Second row")');
	}

	Main.prototype._errorCB = function(err) {
	    alert("Error processing SQL: "+err.code);
	}

	Main.prototype._successCB = function() {
	    // alert("success!");
	}


	Main.prototype.getDraftsCount = function(callback) {
		function query(tx){
			tx.executeSql("SELECT count(*) as count FROM drafts", [], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			var len = results.rows.item(0).count;
			// console.log(results.rows.item(0).count);
			// console.log("Drafts table: " + len + " rows found.");
			callback(len);
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}

	Main.prototype.getDrafts = function(callback) {
		function query(tx){
			tx.executeSql("SELECT * FROM drafts", [], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			var len = results.rows.length;
			console.log("Drafts table: " + len + " rows found.");
			var drafts = [];
			for (var i=0; i<len; i++){
				console.log(results.rows.item(i));
				console.log("Row = " + i + " ID = " + results.rows.item(i).id + " Data =  " + results.rows.item(i).data);
				drafts.push(
					{
						"id": results.rows.item(i).id, 
						"data": JSON.parse(results.rows.item(i).data),
						"type": results.rows.item(i).type,
						"datemodified": results.rows.item(i).datemodified
					}
					);
			}
			callback(drafts);
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}

	Main.prototype.getDraft = function(id, callback) {
		function query(tx){
			tx.executeSql("SELECT * FROM drafts WHERE id = ?", [id], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			callback(JSON.parse(results.rows.item(0).data));
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}

	Main.prototype.addNewDraft = function(jsonDraft, type, description, callback) {
		console.log("Inserting draft into table");
		console.log(jsonDraft);
		function query(tx){
			var time = new Date();
			var timeString = time.toDateString() + " " + time.toLocaleTimeString();
			tx.executeSql("INSERT INTO drafts VALUES(null, ?, ?, ?, null, null, null, ?, ?)", [timeString, timeString, type, description, jsonDraft], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			draftsDB.current_draftid = results.insertId;
			console.log(results);
			if(callback != null)
				callback(results);
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}

	Main.prototype.updateDraft = function(id, jsonDraft, callback) {
		console.log("Updating draft " + id + " in the table");
		function query(tx){
			var time = new Date();
			var timeString = time.toDateString() + " " + time.toLocaleTimeString();

			tx.executeSql("UPDATE drafts SET data = ?, datemodified = ? WHERE id = ?", [jsonDraft, timeString, id], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			console.log(results);
			if(callback != null)
				callback(results);
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}

	Main.prototype.deleteDraft = function(id) {
		function query(tx){
			tx.executeSql("DELETE FROM drafts WHERE id = ?", [id], querySucess, this._errorCB);
		}
		function querySucess(tx, results){
			console.log(results);
		}
	
		this.db.transaction(query, this._errorCB, this._successCB);
	}


	// Passes in a draft from the forms. 
	// The forms then won't need to know if it's the first time they are saving, or if it's a periodic update
	Main.prototype.updateWorkingDraft = function(jsonDraft, type, description, callback){
		var jsonString = "";
		if(jsonDraft instanceof Object){
			jsonString = JSON.stringify(jsonDraft);
		}
		else
			jsonString = jsonDraft;

		if(draftsDB.current_draftid == undefined){
			this.addNewDraft(jsonString, type, description, callback);
		}
		else{
			this.updateDraft(draftsDB.current_draftid, jsonString, callback);
		} 
	}

	Main.prototype.setCurrentDraftID = function(draftId){
		draftsDB.current_draftid = draftId;
	}

	return Main;
})();

var draftsDB;

draftsDB = new draftsDB_setup();
