const {copyRecursiveSync, questionAsync, l} = require('./../functions')
const path = require('path')
const fs = require('fs')
const makeDir = require('make-dir');
const {exec} = require("child_process");
const downloadFile = require('./common/downloader')
const AdmZip = require('adm-zip');
const os = require("os");
const {promisify} = require("util");
const listProjects = require("./common/listProjects");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const {fastAnswerMessages} = require('./common/openai')
const execAsync = promisify(exec);

module.exports = async function () {
    l('🪄 Welcome to NucleusJS generator Wizard - Powered by OpenAI')
    l('* * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
    l('Let`s verify your secret key is installed')

    try {

        const userHomeDir = os.homedir();

        let fullpath = path.join(userHomeDir, 'nucleus')
        let configFile = path.join(userHomeDir, '.nucleusjs', 'config.js')
        let packageJson = path.join(userHomeDir, '.nucleusjs', 'package.json')

        let configFolder = path.join(userHomeDir, '.nucleusjs')
        if (!fs.existsSync(configFile)) {
            throw  new Error(' Config file  doesn`t not exists. Please execute config first')
        }
        let dataFile = await readFileAsync(configFile, 'utf8')
        dataFile = JSON.parse(dataFile)
        if (!dataFile.openai_key) {
            throw  new Error(' Open Ai secret key is not configured, please set up please')
        }
        let sk_open_ai = dataFile.openai_key
        let configJson = fs.readFileSync(configFile, {encoding: 'utf8', flag: 'r'})
        configJson = JSON.parse(configJson)

        let nucleussPath = configJson.template_folder

        l('* * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
        l('SQL is valid for Sequelize projects(mariadb, MySQL, SQLServer,Oracle, Postgress, SQLite) , and noSQL(MongoDB)')
        let SQL_ = 'SQL'
        SQL_ = questionAsync('What type of project you wanna create SQL/noSQL (default: SQL): ')
        if (SQL_ != 'noSQL') {
            SQL_ = 'SQL'
        }

        l('* * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
        l('API is for projects that only needs backend, and FULL includes a backoffice views based on PUG/AdinLTE3')
        let API_ = 'FULL'
        API_ = questionAsync('What type of project you wanna create  API/FULL (default: FULL): ')
        if (API_ != 'API') {
            API_ = 'FULL'
        }
        l('* * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
        l('MVC is a project structure by (models, views, controllers) or Modules is by folder type')
        let MODULES_ = 'Modules'
        MODULES_ = questionAsync('What type of project you wanna create  Modules/MVC (default: Modules): ')
        if (MODULES_ != 'MVC') {
            MODULES_ = 'Modules'
        }

        let project_folder = `nucleus_${API_}_${MODULES_}_${SQL_}`

        let pathTemplate = path.join(nucleussPath, project_folder)

        if (!fs.existsSync(pathTemplate)) {
            l('We can not find template, be sure template exists, ' + path.join(nucleussPath, project_folder) + '  \t')
            return
        }


    } catch (e) {
        console.error(e)
        throw e
    }
    console.table(table)
}
