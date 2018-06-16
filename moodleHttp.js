const http = require('http');
const querystring = require('querystring');

module.exports = {
	getMoodleLoginCookies: (username, password) => {
		return new Promise((resolve, reject) => {
			const postData = querystring.stringify({
				username: username,
				password: password,
				rememberusername: 1
			});

			const options = {
				hostname: 'iic0e.univ-littoral.fr',
				path: '/moodle/login/index.php',
				port: 80,
				method: 'POST',
				headers: {
					'referrer': 'http://iic0e.univ-littoral.fr/moodle/login/index.php',
					'referrerPolicy': 'no-referrer-when-downgrade',
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.3.041',
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
	getAllModulesLinks: cookies => {
		return new Promise((resolve, reject) => {
			const options = {
				hostname: 'iic0e.univ-littoral.fr',
				path: '/moodle/index.php',
				port: 80,
				method: 'GET',
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.3.041',
					'Content-Encoding': 'gzip, deflate',
					'Connection': 'keep-alive',
					'Cookie': cookies.join(";") + ";"
				}
			};

			const req = http.request(options, res => {
				res.setEncoding('utf8');
				let rawData = '';
				res.on('data', chunk => rawData += chunk);
				res.on('end', () => {
					resolve(rawData);
				});
			}).on('error', (e) => {
				console.error(`Got error: ${e.message}`);
				reject();
			});

			req.end();
		});
	}
};