require('dotenv').config()

const moodleHttp = require('./moodleHttp.js');
const moodleParser = require('./moodleParser.js');

(() => {
	console.log("Logging in ...");
	let cookies;
	moodleHttp.getMoodleLoginCookies(process.env.MOODLE_USER, process.env.MOODLE_PASS)
		.catch(err => {
			console.error("Login failed.", err);
			process.exit(-1);
		})
		.then(res => {
			console.log("Login successful.");
			cookies = res;

			console.log("Fetching all modules links ...");
			moodleHttp.getAllModulesLinks(cookies)
				.catch(err => {
					console.error(err);
					process.exit(-1);
				})
				.then(res => {
					console.log("Successfully fetched all modules links.")
				})
		})
})();