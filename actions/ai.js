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


let sleepSetTimeout_ctrl;

function sleep(ms) {
    clearInterval(sleepSetTimeout_ctrl);
    return new Promise(resolve => sleepSetTimeout_ctrl = setTimeout(resolve, ms));
}

let getThree = function (src, three) {
    if (!three) {
        three = [];
    }

    let exists = fs.existsSync(src);
    let stats = exists && fs.statSync(src);
    let isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        three.push(src);
        let files = fs.readdirSync(src);
        files.forEach(function (childItemName) {
            let childItemPath = path.join(src, childItemName);
            getThree(childItemPath, three); // Recursivamente llamamos la función para cada elemento en el directorio
        });
    } else {
        three.push(src);
    }
    return three;
};

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

let replacers = async function (replacerObject, fileContent, template_dir) {
    // replacers functions
    for (let [key, val] of Object.entries(replacerObject?.f)) {
        if (fileContent.includes(val.find)) {
            fileContent = fileContent.replaceAll(val.find, val.value)
        }
    }


    // replacers varaibles
    for (let [key, val] of Object.entries(replacerObject?.v)) {
        if (fileContent.includes(val.find)) {
            let newVal = val.value
            fileContent = fileContent.replaceAll(val.find, newVal)
        }
    }

    return fileContent

}


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
        let project_folderModels = `nucleus_model_${API_}_${MODULES_}_${SQL_}_generator`

        let pathTemplate = path.join(nucleussPath, project_folder)
        let pathTemplateModels = path.join(nucleussPath, project_folderModels)

        if (!fs.existsSync(pathTemplate)) {
            l('We can not find template, be sure template exists, ' + path.join(nucleussPath, project_folder) + '  \t')
            return
        }
        if (!fs.existsSync(pathTemplateModels)) {
            l('We can not find template, be sure template exists, ' + path.join(nucleussPath, project_folder) + '  \t')
            return
        }

        let descriptionInitial = []
        let askAgain = true
        l('\n\n\n\n')
        let description = questionAsync('Give me a detailed description about your APP: ')
        descriptionInitial.push(description)

        let exampleJSON = {
            isComplete: true,
            response_to_user: 'Dame mas detalles sobre la tabla autores, que campos deberia llevar',
            name: "library",
            description: "This is a system for admin a library",
            tables: [{
                name: "books",
                description: "the table where books will be stored",
                fields: [
                    {
                        "name": "name",
                        "description": "The name of book",
                        "customName": "Name",
                        "type": "string",
                        "mandatory": false,
                        "isPassword": false
                    },
                    {
                        "name": "description",
                        "description": "The description of book",
                        "customName": "Description",
                        "type": "string",
                        "mandatory": false,
                        "isPassword": false
                    },
                    {
                        "name": "stock",
                        "description": "The stock of book",
                        "customName": "Stock",
                        "type": "number",
                        "mandatory": false,
                        "defaultValue": 0,
                        "isPassword": false
                    },
                    {
                        "name": "price",
                        "description": "The price of book",
                        "customName": "Price",
                        "type": "number",
                        "mandatory": false,
                        "isPassword": false
                    },
                    {
                        "name": "author",
                        "description": "The author of book",
                        "customName": "Author",
                        "type": "uuid",
                        "mandatory": false,
                        "isPassword": false,
                        "related": 'authors'
                    }
                ]
            },
                {
                    name: "authors",
                    description: "the table where authors will be stored ",
                    fields: [
                        {
                            "name": "name",
                            "description": "The name of author",
                            "customName": "Author Name",
                            "type": "string",
                            "mandatory": false,
                            "isPassword": false
                        },
                        {
                            "name": "about_author",
                            "description": "The description of author",
                            "customName": "About the author",
                            "type": "string",
                            "mandatory": false,
                            "isPassword": false
                        },

                        {
                            "name": "born",
                            "description": "The born date of author",
                            "customName": "Born Date",
                            "type": "date",
                            "mandatory": false,
                            "isPassword": false
                        },
                        {
                            "name": "active",
                            "description": "If Author is active or not",
                            "customName": "Active",
                            "type": "boolean",
                            "mandatory": false,
                            "isPassword": false
                        }
                    ]
                }]
        }
        let about = `Eres un desarrollador senior NodeJS, experto en crear API rest, para ello debes diseñar la estructura de base de datos, tu tarea es crear un archivo de configuración que sera de ayuda para crear la API REST del sistema robusto, de un cliente, para tareas especificas.`
        let JSON_f
        do {
            l('[ 🤖💬 ] > Thinking....')

            let answer = await fastAnswerMessages(sk_open_ai, [
                {
                    "role": "system",
                    "content": about
                },
                {
                    "role": "user",
                    "content": `De acuerdo a la siguiente información entre comillas "Quiero que diseñes una Base de datos para API/REST con las siguientes caracteristicas: ${descriptionInitial.join(', ')}"  Asegurate de definir todas las tablas y campos que consideres necesarios para la creación del sistema
                     La respuesta debe ser en formato JSON como en el siguiente ejemplo:
                     ${JSON.stringify(exampleJSON)}
                    
                     La respuesta debe ser en Formato JSON como se describe a continuación:
                     
                     name: Es el nombre del proyecto (string) camel_case,
                     description: una breve descripcion del proyecto (string),
                     tables: Es un array de las diferentes tablas de la base de datos que deben de existir[Array de objetos]
                        - name: Es el nombre de la tabla en la base de datos(string) camel_case
                        - description: Es la descripcion de lo que almacenará la base de datos
                        - fields: Es un arreglo con los diferentes campos que llevara la tabla [Array de objetos] 
                            -- name: El nombre  del campo (string) camel_case,
                            -- description: una breve descripcion del campo (string),
                            -- custom Name: El nombre con el cual se mostrara en la Vista (string),
                            -- type: El tipo de campo  de dato que es (string), solo es valido alguno de los siguientes valores "string,number,int,decimal,float,boolean,date"
                            -- mandatory: Si es obligatorio o no (boolean) true/false
                            -- defaultValue: El valor por defecto que deberia tener ese campo (boolean/number/string/undefined)
                            -- isPassword: Si el valor debe ser oculatado como una contraseña (boolean) true/false
                     isComplete: si has entendido correctamente lo que quiere el usuario y puedes generar el JSON (Boolean) true/false
                     response_to_user: en caso de que isComplete == false, deberás escribiar aqui una pregunta para que el usuario responda y sea mas claro construir el JSON (string)  
                            
                     
                     unicamente devuelve el JSON, simple y minificado sin mas texto solo el puro JSON, todos los nombres y descripciones del JSOn deben estar en inglés
                     
                     `
                },
            ])

            let response = JSON.parse(answer.data)

            if (response.isComplete) {
                askAgain = false
                JSON_f = response

            } else {
                askAgain = true
                l('\n\n Need more information, be detailed please.')
                l('******************************************* \n\n')
                l(response.response_to_user)
                let description = questionAsync('Tell me: ')
                descriptionInitial.push(description)
            }

        } while (askAgain);


        let runnerJson = {
            name: JSON_f.name,
            description: JSON_f.description,
            steps: [
                {
                    "name": "Install basic template for execute IA",
                    "description": "Install base project based on " + project_folder,
                    "template": project_folder,
                    "values": {
                        "replacer": {
                            "name_project": JSON_f.name,
                            "db_connection": undefined,
                            "api_port": 1111,
                            "jwt_secret": Math.ceil(Math.random() * 100000),
                            "cookie_session_secret": Math.ceil(Math.random() * 10000000)
                        }
                    }
                },
            ]
        }
        for (let item of JSON_f.tables) {
            runnerJson.steps.push(
                {
                    "name": "Create " + item.name + " table",
                    "description": item.description,
                    "template": project_folderModels,
                    "values": {
                        "replacer": {
                            "field_generator": item.fields,
                            "model_name_file": item.name,
                            "model_name_variable": item.name
                        },
                        "appendix": {
                            "routes_name": [
                                {
                                    "api_path": item.name
                                }
                            ],
                            "view_fragment": [
                                {
                                    "view_path": item.name
                                }
                            ],
                            "view_menu": [
                                {
                                    "view_path": item.name,
                                    "title": item.name,
                                    "fa_icon": "fas fa-cog"
                                }
                            ]
                        }
                    }
                }
            )
        }

        let actualPath = path.resolve('.')

        console.log('\n\n > Lets start to execute ' + runnerJson.name)
        console.log(' > ' + runnerJson.description + ' < ')
        l(' \n\n >  full runner json' + JSON.stringify(runnerJson, null, '\n'))

        fs.writeFileSync(path.join(actualPath, runnerJson.name + '.runner.json'), JSON.stringify(runnerJson), 'utf-8');

        for (let xtem of runnerJson.steps) {

            l('********************************')
            l('**** Step: ' + xtem.name + '****')
            l('********************************')

            l(xtem.description)

            let name = xtem.template

            l('Welcome searching template... \t')

            name = name.replaceAll(' ', '_')

            let pathTemplate = path.join(nucleussPath, name)
            if (!fs.existsSync(pathTemplate)) {
                l('SKIP :: we can not find template, be sure template exists, ' + path.join(nucleussPath, name) + '  \t')
                continue
            }

            let pathTemplateConfig = path.join(nucleussPath, name, 'config.json')

            if (!fs.existsSync(pathTemplateConfig)) {
                l('We can not find template config json, be sure template exists  \t')
                return
            }

            l('We execute in actual path ' + actualPath)

            let conf = fs.readFileSync(pathTemplateConfig, {encoding: 'utf8', flag: 'r'})
            conf = JSON.parse(conf)


            let source = path.join(nucleussPath, name, 'structure')
            let destination = actualPath
            let supportedFiles = conf.support_files
            let overwrite = conf.overwrite
            let cmd = conf.cmd

            let template_dir = path.join(nucleussPath, name)
            l('** ** *** install dependencies' + nucleussPath + name)

            try {
                process.chdir(path.join(nucleussPath, name));
                const {stdout, stderr} = await execAsync('npm i');
                console.log('Command executed:');
                console.log('stdout:', stdout);

                if (conf.packages && conf.packages.length > 0) {
                    l('Let´s gonna install the packages ')
                    for (let item of conf.packages) {
                        l('Let´s gonna install ' + item)
                        const {stdout, stderr} = await execAsync('npm i ' + item);
                        console.log('Command executed:');
                        console.log('stdout:', stdout);
                    }
                }
            } catch (e) {
                console.log('Error at install preview dependencies')
            }


            l('Lets configure globals for replacers')

            let replacerObject = {
                n: {},
                f: {},
                v: {},
            }
            if (conf.replacer) {
                for (let item of conf.replacer) {


                    if (item.type == 'n' || item.type == 'v') {
                        let value = xtem?.values?.replacer[item.name] || false
                        item.value = value
                    }

                    if (item.type == 'f') {
                        let file_text = ''
                        for (let mtem of xtem?.values?.replacer[item.name]) {
                            let obj_params = mtem
                            let actual_function = require(path.join(template_dir, 'functions.js'))[item.name]
                            console.log('Execute function ', item.name, actual_function)
                            let exec_function = await actual_function(obj_params)
                            if (exec_function && exec_function.success) {
                                l(exec_function.message);
                                file_text = file_text + '\n' + exec_function.template
                            } else {
                                throw new Error(exec_function.message)
                            }
                        }
                        item.value = file_text
                    }


                    if (item.type == 'f') {
                        item.find = conf?.match?.function?.replace('X', item.name)
                    }
                    if (item.type == 'v') {
                        item.find = conf?.match?.variable?.replace('X', item.name)
                    }
                    if (item.type == 'n') {
                        item.find = conf?.match?.files?.replace('X', item.name)
                    }

                    replacerObject[item.type][item.name] = item
                }
            }


            l('Lets configure globals for appendix')

            let appendixObject = {
                n: {},
                f: {},
                v: {},
            }

            if (conf.appendix) {
                for (let item of conf.appendix) {
                    if (item.type == 'v' || item.type == 'n') {
                        let value = xtem?.values?.appendix[item.name]
                        item.value = value
                    }
                    if (item.type == 'f') {
                        let text_file = ''
                        for (let mtem of xtem?.values?.appendix[item.name]) {
                            let obj_params = {}
                            obj_params = mtem

                            let actual_function = require(path.join(template_dir, 'functions.js'))[item.name]
                            console.log('Execute function ', item.name, actual_function)
                            let exec_function = await actual_function(obj_params)
                            if (exec_function && exec_function.success) {
                                l(exec_function.message);
                                text_file = text_file + ' \n ' + exec_function.template
                            } else {
                                throw new Error(exec_function.message)
                            }
                            console.log('Executes function  correctly ', item.name, item.value)
                        }
                        item.value = text_file
                    }


                    if (item.type == 'f') {
                        item.find = conf?.match?.function?.replace('X', item.name)
                    }
                    if (item.type == 'v') {
                        item.find = conf?.match?.variable?.replace('X', item.name)
                    }
                    if (item.type == 'n') {
                        item.find = conf?.match?.files?.replace('X', item.name)
                    }

                    appendixObject[item.type][item.name] = item
                }
            }

            console.log('replacerObject', replacerObject)
            console.log('appendixObject', appendixObject)
            console.log('destination', destination)
            console.log('source', source)

            l('Reading source three')
            await sleep(1000)
            let three = getThree(source)


            l('Starting  proccess ' + three.length + ' files..')
            await sleep(1000)

            for (let item of three) {
                l('File ' + item)
                await sleep(10)

                let newPath = item.replaceAll(source, destination)

                if (newPath.includes('___')) {
                    if (replacerObject.n) {
                        for (let [key, val] of Object.entries(replacerObject.n)) {
                            if (newPath.includes(val.find)) {
                                let valueN = ''
                                valueN = val.value
                                newPath = newPath.replaceAll(val.find, valueN)
                            }
                        }
                    }
                }
                console.log(newPath)

                if (fs.lstatSync(item).isDirectory()) {
                    //es directorio
                    await makeDir(newPath)
                } else {
                    //no es directorio
                    let ext = newPath.split('.')[newPath.split('.').length - 1]
                    console.log('Check extension ', ext)
                    if (supportedFiles.includes(ext)) {
                        console.log('Valid :: ' + newPath)
                        if ((fs.existsSync(newPath) && conf.overwrite) || !fs.existsSync(newPath)) {
                            try {
                                let fileContent = fs.readFileSync(item, 'utf-8');

                                l('****************************')
                                l('*********REPLACERS**********')
                                l('****************************')
                                fileContent = await replacers(replacerObject, fileContent, template_dir)

                                fs.writeFileSync(newPath, fileContent, 'utf-8');
                            } catch (e) {
                                console.error('Error al mover el archivo', e, ' Continue....')
                            }
                        }
                    } else {
                        console.log('Not valid :: Copy ' + newPath)
                        if (fs.existsSync(newPath)) {
                            if (overwrite) {
                                console.log('Overwited')
                                fs.copyFileSync(item, newPath);
                            }
                        } else {
                            console.log('Copied')
                            fs.copyFileSync(item, newPath);
                        }
                    }
                }
            }

            l('****************************')
            l('*********APENDICERS*********')
            l('****************************')

            // appenddicers functions
            for (let [key, val] of Object.entries(appendixObject?.f)) {

                let newFullDir = path.join(destination, val.dir)
                if (!fs.existsSync(newFullDir)) {
                    l('SKIP :: ' + newFullDir + ' does not exist')
                    continue
                }
                let fileContent = fs.readFileSync(newFullDir, 'utf-8');
                if (fileContent.includes(val.match)) {
                    if (val.position == 'before') {
                        fileContent = fileContent.replaceAll(val.match, val.match + '\n' + val.value)
                    } else {
                        fileContent = fileContent.replaceAll(val.match, val.value + '\n' + val.match)
                    }
                }
                fileContent = await replacers(replacerObject, fileContent, template_dir)
                fs.writeFileSync(newFullDir, fileContent, 'utf-8');
            }

            // appenddicers varaibles
            for (let [key, val] of Object.entries(appendixObject?.v)) {

                let newFullDir = path.join(destination, val.dir)
                if (!fs.existsSync(newFullDir)) {
                    l('SKIP :: ' + newFullDir + ' does not exist')
                    continue
                }
                let fileContent = fs.readFileSync(newFullDir, 'utf-8');

                if (fileContent.includes(val.match)) {
                    let newVal = val.value

                    if (val.position == 'before') {
                        fileContent = fileContent.replaceAll(val.match, val.match + '\n' + newVal)
                    } else {
                        fileContent = fileContent.replaceAll(val.match, newVal + '\n' + val.match)
                    }
                }
                fileContent = await replacers(replacerObject, fileContent, template_dir)
                fs.writeFileSync(newFullDir, fileContent, 'utf-8');
            }
            l('End  proccess ' + three.length + ' files processed..')
            process.chdir(destination);
            for (let item of cmd) {
                try {
                    const {stdout, stderr} = await execAsync(item);
                    console.log('Command executed:');
                    console.log('stdout:', stdout);
                    console.error('stderr:', stderr);
                } catch (e) {
                    console.error('error executing command ' + item + ':', e);
                }
            }
        }


    } catch (e) {
        console.error(e)
        throw e
    }

}
