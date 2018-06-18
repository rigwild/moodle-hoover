const http = require('http');
const querystring = require('querystring');
const url = require('url');

const user_agent = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.3.041';

module.exports = {
	//Connect to Moodle and get the cookies back
	getMoodleLoginCookies: (username, password, link) => {
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
	},
	//Fetch data with login cookies
	getMoodleLoggedInData: (cookies, link) => {
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
	}
};