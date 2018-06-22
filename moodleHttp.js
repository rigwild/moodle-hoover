const http = require('http');
const querystring = require('querystring');
const url = require('url');
const fs = require('fs');
const download = require('download');

const user_agent = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.3.041';


//Connect to Moodle and get the cookies back
module.exports.getMoodleLoginCookies = (username, password, link) => {
  link = url.parse(link);
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      username: username,
      password: password,
      rememberusername: 1
    });

    const options = {
      hostname: link.hostname,
      path: link.path,
      port: 80,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': user_agent,
        'Content-Encoding': 'gzip, deflate',
        'Content-Length': Buffer.byteLength(postData),
        'Connection': 'keep-alive'
      }
    };

    const req = http.request(options, response => {
      let cookies = response.headers["set-cookie"];
      if (cookies && cookies.length >= 4)
        resolve([cookies[1], cookies[3]] || null);
      else
        reject(false);
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      reject();
    });

    req.write(postData);
    req.end();
  });
};


//Fetch data with login cookies
module.exports.getMoodleLoggedInData = (cookies, link) => {
  link = url.parse(link)
  return new Promise((resolve, reject) => {
    const options = {
      hostname: link.hostname,
      path: link.path,
      port: 80,
      method: 'GET',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'User-Agent': user_agent,
        'Content-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cookie': cookies.join(";") + ";"
      }
    };

    const req = http.request(options, res => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => resolve(rawData));
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      reject();
    });

    req.end();
  });
};


//Download all the files from a module
module.exports.downloadModuleFiles = (cookies, userPath, moodleModule) =>
  new Promise((resolve, reject) => {
    //Create the module directory
    //Limiting to 200 chars and replacing all bad chars with _ for directories names
    const modulePath = userPath + moodleModule.title.substring(0, 200).replace(/([^a-z0-9éèà]+)/gi, '_') + "/";
    if (!fs.existsSync(modulePath))
      fs.mkdirSync(modulePath);
    console.log("Created the directory for the module : " + moodleModule.title + ".");

    //Go to next module if current is empty
    if (!moodleModule || !moodleModule.moduleContent.hasOwnProperty("uploads"))
      return;
    //Create an array of promises to download all files
    let moduleLinks = [];
    moodleModule.moduleContent.uploads.forEach(y => {
      //It's a directory or a homework/test
      if (y.hasOwnProperty("downloadLink") && y.downloadLink.length > 0)
        y.downloadLink.forEach(z => {
          if (!fs.existsSync(modulePath + y.title + "/"))
            fs.mkdirSync(modulePath + y.title + "/");
          moduleLinks.push({
            link: z.link,
            path: modulePath + y.title + "/"
          })
        })
      //It's a file
      else if (y.type === "file")
        moduleLinks.push({
          link: y.link,
          path: modulePath
        });
    })
    //Download the files from the module
    const options = {
      headers: {
        'User-Agent': user_agent,
        'Content-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cookie': cookies.join(";") + ";"
      }
    };

    console.log("Downloading files from the module : " + moodleModule.title + " ...");
    Promise.all(moduleLinks.map(async w => await download(w.link, w.path, options)))
      .then(() => {
        console.log("Success downloading files from the module : " + moodleModule.title + ". Path of the module : " + modulePath);
        resolve();
      })
      .catch(err => console.error(err))
  });