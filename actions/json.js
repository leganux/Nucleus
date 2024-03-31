const {copyRecursiveSync, questionAsync, l} = require('./../functions')
const path = require('path')
const fs = require('fs')
const makeDir = require('make-dir');
const {exec} = require("child_process");
const {promisify} = require('util');
const os = require("os");
const v = require("voca");
const moment = require("moment");
const listProjects = require("./common/listProjects");
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

module.exports = async function ({path_}) {
    const userHomeDir = os.homedir();

    let myPath = path.join(path_[0])
    if (!fs.existsSync(myPath)) {
        l('We can not find the JSON file \t')
        return
    }

    l('Welcome we gonna execute template... \t')

    let configFile = path.join(userHomeDir, '.nucleusjs', 'config.js')
    if (!fs.existsSync(configFile)) {
        l('We can not find config file, please execute "configure" comand please  \t')
        return
    }
    let configJson = fs.readFileSync(configFile, {encoding: 'utf8', flag: 'r'})
    configJson = JSON.parse(configJson)

    let nucleussPath = configJson.template_folder

    let runnerJson = fs.readFileSync(myPath, {encoding: 'utf8', flag: 'r'})
    runnerJson = JSON.parse(runnerJson)

    console.log(' > Lets start to execute ' + runnerJson.name)
    console.log(' > ' + runnerJson.description + ' < ')

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
        let actualPath = path.resolve('.')
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
}
