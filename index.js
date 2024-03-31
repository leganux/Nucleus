#! /usr/bin/env node

const {program} = require('commander')

const configure = require('./actions/configure')
const execute = require('./actions/execute')
const make = require('./actions/make')
const publish = require('./actions/publish')
const use = require('./actions/use')
const list = require('./actions/list')
const ai = require('./actions/ai')
const json = require('./actions/json')


program
    .command('configure')
    .description('Create or update the config file for nucleus engine')
    .option('-d, --dir <dir...>', 'Default directory to store local templates')
    .option('-l, --login <login...>', 'Verify and store credentials to ')
    .option('-ai, --openai <openai...>', 'Save the open AI token in config JSON for create function')
    .option('-f, --files <files...>', 'Adds support files to config. Default  "js","html","pug","ts","tsx","htm","xml","txt","py","php","vue","vuex","ng","md","yaml","lua"')
    .action(configure)


program
    .command('list')
    .description('list all local templates')
    .action(list)

program
    .command('make')
    .description('Create a new nucleus')
    .option('-n, --name <name...>', 'The name for template')
    .action(make)

program
    .command('execute')
    .description('Execute nucleus in current directory')
    .option('-n, --name <name...>', 'The name for template')
    .action(execute)

program
    .command('publish')
    .description('Upload and share your template with th comunity')
    .option('-n, --name <name...>', 'The name for template')
    .action(publish)

program
    .command('use')
    .description('Download template from community to local folder')
    .option('-n, --name <name...>', 'The name for template')
    .action(use)

program
    .command('ai')
    .description('Executes AI generation project Wizard')
    .action(ai)

program
    .command('json')
    .option('-p, --path_ <path_...>', 'The url path for json to be processed')
    .description('Executes a template with params and info preconfigured in a JSON')
    .action(json)


program.parse()
