# moodle-hoover
This is a node.js script which will download all the files available in a Moodle account. It downloads files, PDFs and the content of test work boxes (Homework too). A file is generated with all the data scrapped from your Moodle account.

## Install
To install this app, you first need to have node.js and npm. You can do so by executing these commands :

	$ curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
	$ sudo apt-get install -y nodejs

You can find more informations on node.js's installation guide : [https://nodejs.org/en/download/package-manager/](https://nodejs.org/en/download/package-manager/).

___
You then need to download the content of the repository and install the needed dependencies through these commands :

    $ git clone https://github.com/rigwild/moodle-hoover
    $ npm install
## Configure
In order to configure this script, you need to modify the file *./.env* with your settings :

    MOODLE_USER="username"
	MOODLE_PASS="password"
	MOODLE_URL="http://url_of_moodle_homepage.com/"
	FILES_DOWNLOAD_DIRECTORY="./downloads/"

Don't forget the ending slash in the Moodle URL or it will not work. If the login fails, change the path in *./app.js* line 29 matching the login page :

	moodleURL + "login/index.php"
	
If you style have issues logging in, check which parameters are sent through the login page and change these lines (line 19 in *./moodleHttp.js*) with the corresponding parameters :

	const postData = querystring.stringify({
	      username: username,
	      password: password,
	      rememberusername: 1
	});
___
You are done ! To start the script just run this in the root of the project's directory :

    $ npm start
Please keep in mind that i did my testing on my own school's Moodle, so it may not work on your's and you will need to do some adjustments (Regexps, redirects). You can open an issue and I will make sure to look into it.

## Demo
![demo](https://github.asauvage.fr/img/other/moodle-hoover.gif)
## License

This project is licensed under the [MIT](https://github.com/rigwild/moodle-hoover/blob/master/LICENSE) license.