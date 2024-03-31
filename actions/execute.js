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

            if (val.global) {
                fileContent = fileContent.replaceAll(val.find, val.value)
            } else {

                let ex_func = questionAsync('>You wanna execute function ' + key + ' to add values y/(n) :  ')
                let arrData = []
                while (ex_func.toLowerCase() == 'y') {
                    let obj_params = {}
                    for (let ktem of val.params) {
                        let myvalue = questionAsync('> In function ' + key + ' give me the value for ' + ktem + ':  ')
                        obj_params[ktem] = myvalue
                    }

                    let actual_function = require(path.join(template_dir, 'functions.js'))[val.name]
                    console.log('Execute function ', val.name, actual_function)
                    let exec_function = await actual_function(obj_params)

                    if (exec_function && exec_function.success) {
                        l(exec_function.message);
                        arrData.push(exec_function.template)
                    }
                    ex_func = questionAsync('>You wanna execute function ' + key + ' again to add new  values y/(n) :  ')
                }
                if (arrData.length > 0) {
                    fileContent = fileContent.replaceAll(val.find, arrData.join(' '))
                }
            }
        }
    }


    // replacers varaibles
    for (let [key, val] of Object.entries(replacerObject?.v)) {
        if (fileContent.includes(val.find)) {
            let newVal = ''
            if (val.global) {
                newVal = val.value
            } else {
                newVal = questionAsync((val.ask && val.ask != '') ? val.ask : '> Give me the value for variable ' + key + ': ')
            }
            fileContent = fileContent.replaceAll(val.find, newVal)
        }
    }

    return fileContent

}

module.exports = async function ({name}) {
    const userHomeDir = os.homedir();

    l('Welcome we gonna execute template... \t')

    let configFile = path.join(userHomeDir, '.nucleusjs', 'config.js')
    if (!fs.existsSync(configFile)) {
        l('We can not find config file, please execute "configure" comand please  \t')
        return
    }
    let configJson = fs.readFileSync(configFile, {encoding: 'utf8', flag: 'r'})
    configJson = JSON.parse(configJson)

    let nucleussPath = configJson.template_folder


    let table = listProjects()
    l('********   My Templates  **********')
    console.table(table)


    if (!name) {
        name = questionAsync('Give me the template name: ')
    } else {
        name = name[0]
    }

    l('Welcome searching template... \t')

    name = name.replaceAll(' ', '_')

    let pathTemplate = path.join(nucleussPath, name)
    if (!fs.existsSync(pathTemplate)) {
        l('We can not find template, be sure template exists, ' + path.join(nucleussPath, name) + '  \t')
        return
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
    let pathFunctions = path.join(nucleussPath, name, conf.functions_file)
    let exec_functions = require(pathFunctions)
    let source = path.join(nucleussPath, name, 'structure')
    let destination = actualPath
    let supportedFiles = conf.support_files
    let overwrite = conf.overwrite
    let cmd = conf.cmd


    let template_dir = path.join(nucleussPath, name)

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

            if (item.global) {
                let value
                if (item.ask && (item.type == 'n' || item.type == 'v')) {
                    value = questionAsync('>' + item.ask + '  ')
                    item.value = value
                } else if (item.type == 'n' || item.type == 'v') {
                    value = questionAsync('> Give me the value for ' + item.name + ':  ')
                    item.value = value
                }
                if (item.type == 'f') {
                    let obj_params = {}
                    for (let jtem of item.params) {
                        value = questionAsync('> In function ' + item.name + ' give me the value for ' + jtem + ':  ')
                        obj_params[jtem] = value
                    }
                    item.function_values = obj_params
                    let actual_function = require(path.join(template_dir, 'functions.js'))[item.name]
                    console.log('Execute function ', item.name, actual_function)
                    let exec_function = await actual_function(obj_params)
                    if (exec_function && exec_function.success) {
                        l(exec_function.message);
                        item.value = exec_function.template
                    } else {
                        throw new Error(exec_function.message)
                    }
                    console.log('Executes function  correctly ', item.name)

                }
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
            if (item.global) {
                let value
                if (item.ask && (item.type == 'n' || item.type == 'v')) {
                    value = questionAsync('>' + item.ask + '  ')
                    item.value = value
                } else if (item.type == 'n' || item.type == 'v') {
                    value = questionAsync('> Give me the value for ' + item.name + ' ')
                    item.value = value
                }
                if (item.type == 'f') {
                    let obj_params = {}
                    for (let jtem of item.params) {
                        value = questionAsync('> In function ' + item.name + ' give me the value for ' + jtem + ': ')
                        obj_params[jtem] = value
                    }
                    item.function_values = obj_params

                    let actual_function = require(path.join(template_dir, 'functions.js'))[item.name]
                    console.log('Execute function ', item.name, actual_function)
                    let exec_function = await actual_function(obj_params)
                    if (exec_function && exec_function.success) {
                        l(exec_function.message);
                        item.value = exec_function.template
                    } else {
                        throw new Error(exec_function.message)
                    }
                    console.log('Executes function  correctly ', item.name, item.value)
                }
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
                        if (val.global) {
                            valueN = val.value
                        } else {
                            valueN = questionAsync((val.ask && val.ask != '') ? val.ask : '> Give me the value for file name ' + key + ': ')
                        }
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
        console.log('_ _ _ _ _ _val match ', val.dir)
        let newFullDir = path.join(destination, val.dir)
        if (!fs.existsSync(newFullDir)) {
            l('SKIP :: ' + newFullDir + ' does not exist')
            continue
        }
        let fileContent = fs.readFileSync(newFullDir, 'utf-8');
        if (fileContent.includes(val.match)) {
            if (val.global) {
                console.log('AAAAA')

                if (val.position == 'before') {
                    fileContent = fileContent.replaceAll(val.match, val.match + '\n' + val.value)
                } else {
                    fileContent = fileContent.replaceAll(val.match, val.value + '\n' + val.match)
                }


            } else {
                console.log('BBBBB')

                let ex_func = questionAsync('>You wanna execute function ' + key + ' to add values y/(n) :  ')
                let arrData = []
                while (ex_func.toLowerCase() == 'y') {

                    let obj_params = {}
                    for (let ktem of val.params) {
                        let myvalue = questionAsync('> In function ' + key + ' give me the value for appendix ' + ktem + ':  ')
                        obj_params[ktem] = myvalue
                    }

                    let actual_function = require(path.join(template_dir, 'functions.js'))[val.name]
                    console.log('Execute function ', val.name, actual_function)

                    let response__ = ''
                    let exec_function = await actual_function(obj_params)
                    if (exec_function && exec_function.success) {
                        l(exec_function.message);
                        arrData.push(exec_function.template)
                        response__ = exec_function.template

                        if (val.position == 'before') {
                            fileContent = fileContent.replaceAll(val.match, val.match + '\n' + response__)
                        } else {
                            fileContent = fileContent.replaceAll(val.match, response__ + '\n' + val.match)
                        }
                    }
                    ex_func = questionAsync('>You wanna execute function ' + key + ' again to add new values y/(n) :  ')
                }
            }
        }
        fileContent = await replacers(replacerObject, fileContent, template_dir)
        fs.writeFileSync(newFullDir, fileContent, 'utf-8');
    }

    // appenddicers varaibles
    for (let [key, val] of Object.entries(appendixObject?.v)) {
        console.log('_ _ _ _ _ _val match ', val.dir)

        let newFullDir = path.join(destination, val.dir)
        if (!fs.existsSync(newFullDir)) {
            l('SKIP :: ' + newFullDir + ' does not exist')
            continue
        }
        let fileContent = fs.readFileSync(newFullDir, 'utf-8');

        if (fileContent.includes(val.match)) {
            let newVal = ''
            if (val.global) {
                newVal = val.value
            } else {
                newVal = questionAsync((val.ask && val.ask != '') ? val.ask : '> Give me the value for variable appendix ' + key + ': ')
            }
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
