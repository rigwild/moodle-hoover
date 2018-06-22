require('dotenv').config()

const moodleHttp = require('./moodleHttp.js');
const moodleParser = require('./moodleParser.js');
const fs = require('fs');
const download = require('download');


const moodleURL = "http://iic0e.univ-littoral.fr/moodle/";
const filesDownloadDirectory = "./downloads/"

const username = process.env.MOODLE_USER;
const password = process.env.MOODLE_PASS;

//Login cookies container
let cookies;
//Will contain most of the data
let dataContainer;
//Will contain the logged in user directory path
let userPath;

(() => {
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
      return moodleHttp.getMoodleLoggedInData(cookies, `${moodleURL}index.php`)
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
      dataContainer.forEach(moodleModule => {
        moodleModule.moduleContent.uploads.forEach(y => {
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
                    console.log(`Got the download link of : ${moodleModule.title} # ${y.title} ...`);
                    resolve();
                  })
              }
              //Other ones don't redirect, already direct download links
              else {
                console.log(`Got the download link of : ${moodleModule.title} # ${y.title} ...`);
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
      return new Promise((resolve, reject) => {
        dataContainer.forEach((moodleModule) => {
          //modules directories names, Limiting to 200 chars and replacing all bad chars with "_"
          const modulePath = userPath + moodleHttp.cleanFileName(moodleModule.title) + "/";
          moodleHttp.downloadModuleFiles(cookies, modulePath, moodleModule)
            .then(() => {
              console.log(`Success downloading files from the module : ${moodleModule.title}. Path of the module : ${modulePath}`);
              resolve();
            })
            .catch(err => console.error(err));
        });
      });
    })
    .then(() => {
      //End of the script
      console.log(`\n\nAll the files have been downloaded to : ${userPath}. A JSON file containing all the data about these files was created in : ${userPath}`);
      console.log("Thanks for using this program. You can find the project's Github repository here : https://github.com/rigwild/moodle-hoover");
    })
    .catch(err => console.error(err))
})();