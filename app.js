require('dotenv').config()

const moodleHttp = require('./moodleHttp.js');
const moodleParser = require('./moodleParser.js');
const fs = require('fs');
const download = require('download');

const moodleURL = "http://iic0e.univ-littoral.fr/moodle/";
const filesDownloadDirectory = "./downloads/"

const username = process.env.MOODLE_USER;

//Will contain most of the data
let dataContainer;

(() => {
	console.log("Logging in ...");
	let cookies;
	//Login to moodle
	moodleHttp.getMoodleLoginCookies(
			process.env.MOODLE_USER,
			process.env.MOODLE_PASS,
			moodleURL + "login/index.php"
		)
		.catch(err => {
			console.error("Login failed.", err);
			process.exit(-1);
		})
		.then(res => {
			console.log("Login successful.");
			cookies = res;

			//Fetching home page (with modules links)
			console.log("Fetching all modules links ...");
			return moodleHttp.getMoodleLoggedInData(cookies, moodleURL + "index.php")
		})
		.catch(err => {
			console.error(err);
			process.exit(-1);
		})
		.then(res => {
			//Parsing the home page to get the modules links
			res = moodleParser.parseAllModulesLinks(res);
			console.log("Success fetching all modules links.");
			console.log("Fetching each modules content links ...");

			//Create an array of promises to get all the modules content links (not the files links yet!)
			//Set the results to res var
			dataContainer = res;
			let promisesArray = [];
			dataContainer.forEach(x => {
				console.log(x)
				promisesArray.push(
					new Promise((resolve, reject) => {
						moodleHttp.getMoodleLoggedInData(cookies, x.link)
							.catch(err => {
								console.log("Failed fetching module content links : " + x.title);
								console.error(err);
								reject();
							})
							.then(resx => {
								console.log("Success fetching module content links : " + x.title);
								x.moduleContent = moodleParser.parseModuleContent(resx);
								resolve();
							})
					})
				);
			});

			//Makes sure all promises have been completed
			return Promise.all(promisesArray);
		})
		.catch(err => console.error(err))
		.then(() => {
			console.log("Success fetching all the modules links.");
			console.log("Getting all the direct download links of your files ...");
			//Create an array of promises to get all the files direct download links
			let promisesArray2 = [];
			dataContainer.forEach(x => {
				x.moduleContent.uploads.forEach(y => {
					promisesArray2.push(
						new Promise((resolve, reject) => {
							//These link types redirect to another page
							if (y.type === "PDF" || y.type === "directory" || y.type === "test" || y.type === "homework") {
								moodleHttp.getMoodleLoggedInData(cookies, y.link)
									.catch(err => {
										console.error(err);
										reject();
									})
									.then(res => {
										y.downloadLink = moodleParser.parseDownloadPage(res);
										console.log("Got the download link of : " + y.title + " ...");
										resolve();
									})
							}
							//Other ones don't redirect, already direct download links
							else {
								console.log("Got the download link of : " + y.title + " ...");
								resolve();
							}
						})
					);
				});
			});

			//All the data is in the "dataContainer" variable.
			//Makes sure all promises have been completed
			return Promise.all(promisesArray2);
		})
		.catch(err => console.log(err))
		.then(() => {
			console.log("Success getting all the download links of your files.");
			console.log("Downloading all of your files... This can take some time ...");

			//Create the user directory
			const userPath = filesDownloadDirectory + username + "/";
			if (!fs.existsSync(filesDownloadDirectory))
				fs.mkdirSync(filesDownloadDirectory);
			if (!fs.existsSync(userPath))
				fs.mkdirSync(userPath);

			//Write the data to a json file
			fs.writeFileSync(userPath + "moodle_data.json", JSON.stringify(dataContainer));

			//Create an array of promises to download all files
			let moduleLinks;
			dataContainer.forEach(x => {
				new Promise((resolve, reject) => {
						//Create the module directory
						//Limiting to 200 chars and replacing all bad chars with _ for directories names
						let modulePath = userPath + x.title.substring(0, 200).replace(/([^a-z0-9éèà]+)/gi, '_') + "/";
						if (!fs.existsSync(modulePath))
							fs.mkdirSync(modulePath);
						console.log("Created the directory for the module : " + x.title + ".");

						//Go to next module if current is empty
						if (!x || !x.moduleContent.hasOwnProperty("uploads")) return;

						moduleLinks = [];
						let count = 0,
							max = x.moduleContent.uploads.length;
						x.moduleContent.uploads.forEach(y => {
							//It's a directory or a homework/test
							if (y.hasOwnProperty("downloadLink") && y.downloadLink.length > 0)
								y.downloadLink.forEach(z => {
									if (!fs.existsSync(modulePath + z.title + "/"))
										fs.mkdirSync(modulePath + z.title + "/");
									moduleLinks.push({
										link: z.link,
										path: modulePath + z.title + "/"
									})
								})
							//It's a file
							else if (y.type === "file")
								moduleLinks.push({
									link: y.link,
									path: modulePath
								});
							if (count === max)
								resolve();
							count++;
						})

					}) //finished 
					.catch(err => console.error(err))
					.then(() => {
						//Download the files from the module
						const options = {
							headers: {
								'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.3.041',
								'Content-Encoding': 'gzip, deflate',
								'Connection': 'keep-alive',
								'Cookie': cookies.join(";") + ";"
							}
						};

						console.log("Downloading files from the module : " + x.title + " ...");
						Promise.all(moduleLinks.map(w => download(w.link, w.path, options)))
							.catch(err => console.error(err))
							.then(() => {
								console.log("Success downloading files from the module : " + x.title + ". Path of the module : " + modulePath);
							});
					})
			})
			//End of the script
			console.log("\n\n\nAll the files have been downloaded to : " + userPath + ". A JSON file containing all the data about these files was created in : " + userPath);
			console.log("Thanks for using this program. You can find the project's Github repository here : https://github.com/rigwild/moodle-hoover");
		})
})();