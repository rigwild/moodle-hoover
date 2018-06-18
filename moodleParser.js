const http = require('http');

//An object with all the needed regex
const regexList = {
	coursesPage: /coursebox.*?href=\"(.*?)\"\>(.*?)\<\/a\>/mg,
	modulePage: {
		title: /\<title\>(.*?)\<\/title\>/,
		uploadsGroups: /\<div class=\"activityinstance\"\>.*?\<\/div\>/g,
		uploads: /href=\"(.*?)\".*?\"instancename\"\>(.*?)\<.*(?:\"accesshide.*?\>(.*?)\<)*/,
		uploadType: /(resource|assign|assignment|folder|forum|url|wiki|page|data)/
	},
	downloadPage: {
		pdfViewer: /href=\"(.*?\.pdf)\".*?\>(.*?)\<\/a\>/g,
		homework: /\<div\>.*?\<a href=\"(.*?)\"\>(.*?)\<\/a\>/g,
		directoryContent: /href=\"(.*?)\".*?alt=\"(.*?)\"/g
	}
}

//Cut the outer page of moodle
const cutOuterPage = data => {
	try {
		let temp = data.split("<!-- main mandatory content of the moodle page  -->")
		if (temp) data = temp[1]
		temp = data.split("<!-- end of main mandatory content of the moodle page -->")
		if (temp) data = temp[0]
	} catch (e) {}
	return data
}


module.exports = {
	//The index page where every modules is listed
	parseAllModulesLinks: data => {
		data = cutOuterPage(data)
		let modules = [],
			temp
		//Get all the modules
		while ((temp = regexList.coursesPage.exec(data)) !== null)
			modules.push({
				title: temp[2],
				link: temp[1]
			})
		return modules
	},

	//A module page parser
	parseModuleContent: data => {
		//Grab module title
		let pageTitleMatch = data.match(regexList.modulePage.title)
		if (!pageTitleMatch) return null

		let moduleContent = {
			moduleTitle: (pageTitleMatch[1]) ? pageTitleMatch[1] : null,
			uploads: []
		}

		//Grab each activities available
		let temp = data.match(regexList.modulePage.uploadsGroups)
		if (!temp) return null

		temp.forEach(x => {
			x = x.match(regexList.modulePage.uploads)
			if (!x) return null
			let temp = {
				title: (x.length > 2) ? x[2].trim() : null,
				link: (x.length > 1) ? x[1].trim() : null,
				type: (x[0].includes('PDF')) ? "PDF" : null
			}
			if (!temp.type) {
				switch ((x.length > 1) ? x[1].trim().match(regexList.modulePage.uploadType)[1] : null) {
					case "resource":
						temp.type = "file"
						break
					case "assign":
						temp.type = "homework"
						break
					case "assignment":
						temp.type = "test"
						break
					case "folder":
						temp.type = "directory"
						break
					case "forum":
						temp.type = "forum"
						break
					case "wiki":
						temp.type = "wiki"
						break
					case "url":
						temp.type = "url"
						break
					case "page":
						temp.type = "page"
						break
					case "":
					default:
						temp.type = null
						break
				}
			}
			moduleContent.uploads.push(temp)
		})
		return moduleContent
	},

	//a download page parser (Deposit box/pdf-viewer/directory)
	parseDownloadPage: data => {
		data = cutOuterPage(data)

		let fileList = [],
			temp

		//PDF viewer
		while ((temp = regexList.downloadPage.pdfViewer.exec(data)) !== null) {
			fileList.push({
				name: temp[2],
				link: temp[1]
			})
		}

		//Homework/test
		if (fileList.length === 0) {
			while ((temp = regexList.downloadPage.homework.exec(data)) !== null) {
				fileList.push({
					name: temp[2],
					link: temp[1]
				})
			}
		}

		//Directory content
		if (fileList.length === 0) {
			while ((temp = regexList.downloadPage.directoryContent.exec(data)) !== null) {
				fileList.push({
					name: temp[2],
					link: temp[1]
				})
			}
		}

		return fileList
	}
}