require('dotenv').config();

const moodleHttp = require('./moodleHttp.js');
const moodleParser = require('./moodleParser.js');
const fs = require('fs');
const download = require('download');

const username = process.env.MOODLE_USER;
const password = process.env.MOODLE_PASS;

const moodleURL = process.env.MOODLE_URL;
const filesDownloadDirectory = process.env.FILES_DOWNLOAD_DIRECTORY || "./downloads/";

//Login cookies container
let cookies;
//Will contain most of the data
let dataContainer;
//Will contain the logged in user directory path
let userPath;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const setup_cli = () => {
  console.log(`Logging in with the user "${username}" ...`);
  //Login to moodle
  moodleHttp.getMoodleLoginCookies(
      username,
      password,
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
      return moodleHttp.getMoodleLoggedInData(cookies, `${moodleURL}index.php`);
    })
    .catch(err => {
      console.error(err);
      process.exit(-1);
    })
    .then(res => {
      //Parsing the home page to get the modules links
      dataContainer = moodleParser.parseAllModulesLinks(res);
      console.log(`\nSuccess fetching all modules links. Found ${dataContainer.length} modules.`);
      console.log("Fetching each modules content links ...");

      //Create an array of promises to get all the modules content links (not the files links yet!)
      let promisesArray = [];
      dataContainer.forEach(moodleModule => {
        promisesArray.push(
          new Promise((resolve, reject) => {
            moodleHttp.getMoodleLoggedInData(cookies, moodleModule.link)
              .catch(err => {
                console.log(`Failed fetching module content links : ${moodleModule.title}`);
                console.error(err);
                reject();
              })
              .then(resx => {
                console.log(`Success fetching module content links : ${moodleModule.title}`);
                moodleModule.moduleContent = moodleParser.parseModuleContent(resx);
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
      console.log("\nSuccess fetching all the modules links.");
      console.log("Getting all the direct download links of your files ...");
      //Create an array of promises to get all the files direct download links
      let promisesArray2 = [];

      //All the data is in the "dataContainer" variable.
      //Makes sure all promises have been completed
      return new Promise(async resolveAllLinks => {
        //Get the download links of each module, one module by one module
        for (let moodleModule of dataContainer) {
          promisesArray2 = [];

          //We set up an array of promises for one module
          //each download links of this module are fetched simultaneously
          for (let upload of moodleModule.moduleContent.uploads) {
            promisesArray2.push(
              new Promise((resolve, reject) => {
                //These link types redirect to another page
                if (upload.type === "PDF" ||
                  upload.type === "directory" ||
                  upload.type === "test" ||
                  upload.type === "homework"
                ) {
                  moodleHttp.getMoodleLoggedInData(cookies, upload.link)
                    .catch(err => {
                      console.error(err);
                      reject();
                    })
                    .then(res => {
                      upload.downloadLink = moodleParser.parseDownloadPage(res);
                      console.log(`Got the download link of : ${moodleModule.title} # ${upload.title} ...`);
                      resolve();
                    });
                }
                //Other ones don't redirect, already direct download links
                else {
                  console.log(`Got the download link of : ${moodleModule.title} # ${upload.title} ...`);
                  resolve();
                }
              }) //Promise end
            ); //Promise pushed in array end
          } //for end
          console.log(`\nGetting the download links of the module : ${moodleModule.title} ...`);
          try {
            //Starting to get all the download links of this module
            await Promise.all(promisesArray2);
          } catch (e) {
            console.log(e);
          }
          console.log("Waiting 10 seconds to not be temporarely banned from the server ...")
          await delay(10000);
          console.log("Delay just finished. The script continues ...");
        }; //for end
        //We got all download links
        resolveAllLinks();
      }); //big Promise end
    })
    .catch(err => console.log(err))
    .then(() => {
      console.log("\nSuccess getting all the download links of your files.");
      console.log("Downloading all of your files... This can take some time ...");

      //Create the user directory
      userPath = `${filesDownloadDirectory}${username}/`;
      if (!fs.existsSync(filesDownloadDirectory))
        fs.mkdirSync(filesDownloadDirectory);
      if (!fs.existsSync(userPath))
        fs.mkdirSync(userPath);

      //Write the data to a json file
      fs.writeFileSync(`${userPath}moodle_data.json`, JSON.stringify(dataContainer));

      //Download the content of each modules
      return new Promise(async (resolve, reject) => {
        for (let moodleModule of dataContainer) {
          //modules directories names, Limiting to 200 chars and replacing all bad chars with "_"
          const modulePath = userPath + moodleHttp.cleanFileName(moodleModule.title) + "/";
          try {
            await moodleHttp.downloadModuleFiles(cookies, modulePath, moodleModule)
            console.log(`Success downloading files from the module : ${moodleModule.title}. Path of the module : ${modulePath}`);
          } catch (err) {
            console.log(`Failed downloading files from the module : ${moodleModule.title}. Error message : ${err}`);
          }
          console.log("Waiting 10 seconds to not be temporarely banned from the server ...")
          await delay(10000);
          console.log("Delay just finished. The script continues ...");
        }
        resolve();
      });
    })
    .then(() => {
      //End of the script
      console.log(`\n\nAll the files have been downloaded to : ${userPath}. A JSON file containing all the data about these files was created in : ${userPath}`);
      console.log("Thanks for using this program. You can find the project's Github repository here : https://github.com/rigwild/moodle-hoover");
    })
    .catch(err => console.error(err));
};

setup_cli();