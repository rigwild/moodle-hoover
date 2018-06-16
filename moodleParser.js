const http = require('http');

module.exports = {
	//An object with all the needed regex
	regexList: {
		coursesPage: /coursebox.*?href=\"(.*?)\"\>(.*?)\<\/a\>/mg,
		modulePage: {
			title: /\<div class=\"summary\"\>\<div class=\"no-overflow\"\>\<h1 style=\"text-align: center;\"\>(.*)\<\/h1\>/,
			uploadsGroups: /\<div class=\"activityinstance\"\>.*?\<\/div\>/g,
			uploads: /href=\"(.*?)\".*?\"instancename\"\>(.*?)\<.*(?:\"accesshide.*?\>(.*?)\<)*/,
			uploadType: /(resource|assign|assignment|folder|forum|url|wiki)/
		},
		homeworkPage: {
			test: /\<div class=\"files\"\>\<a href=\"(.*?)\".*?title=\"(.*?)\".*?\/\>(.*?)\<\/a\>/,
			homework: /\<div id=\"assign_files.*?\"\>.*?alt=\"(.*?)\".*?\<a href=\"(.*?)\"/
		}
	},
	//Cut the outer page of moodle
	cutOuterPage: data => {
		let temp = data.split("<!-- main mandatory content of the moodle page  -->")
		if (temp) data = temp[1]
		temp = data.split("<!-- end of main mandatory content of the moodle page -->")
		if (temp) data = temp[0]
		return data
	},

	//The index page where every modules is listed
	getAllModules: data => {
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
	getModuleContent: data => {
		data = cutOuterPage(data)

		//Grab page useful data
		let pageTitleMatch = data.match(regexList.modulePage.title)
		if (!pageTitleMatch) return null
		let moduleContent = {
			moduleTitle: (pageTitleMatch[1]) ? pageTitleMatch[1] : null,
			uploads: []
		}
		data.match(regexList.modulePage.uploadsGroups).forEach(x => {
			x = x.match(regexList.modulePage.uploads)
			let temp = {
				title: (x.length > 2) ? x[2].trim() : null,
				link: (x.length > 1) ? x[1].trim() : null
			}
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
				default:
					temp.type = null
					break
			}
			moduleContent.uploads.push(temp)
		})
		return moduleContent
	},

	//a homework page parser (Deposit box)
	getHomeworkContent: data => {
		data = cutOuterPage(data)

		//Grab page useful data
		//Test if the page is a test page
		let fileList = data.match(regexList.homeworkPage.test)
		if (fileList) {
			fileList = {
				name: fileList[3],
				type: fileList[2],
				link: fileList[1]
			}
			return fileList
		}

		//Test if the page is a homework page
		fileList = data.match(regexList.homeworkPage.homework)
		if (fileList) {
			fileList = {
				name: fileList[1],
				type: null,
				link: fileList[2]
			}
			return fileList
		}

		//Page was not recognized
		return
	}
}