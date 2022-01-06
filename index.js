#!/usr/bin/env node
const inquirer = require('inquirer') //命令行交互
let webFlowWork = require("./src/web");
let javaFlowWork = require("./src/java");
const chalk = require('chalk') //命令行颜色
const errorLog = log => console.log(chalk.red(`✘ ${log}`))
let CONFIG = {}, pathHierarchy = './';

console.log(chalk.green(`☺ 欢迎使用自动部署工具！`))

try {
  CONFIG = require(`${pathHierarchy}deploy.config.json`) // 项目配置
} catch (error) {
  errorLog('请在项目根目录添加 deploy.config.js 配置文件, 参考说明文档中的配置')
  process.exit() //退出流程
}

const startFlowWork = (flowWork) => {

  if (CONFIG.development && CONFIG.production) {
    inquirer
      .prompt([{
        type: 'list',
        message: '请选择发布环境',
        name: 'env',
        choices: [{
          name: '测试环境',
          value: 'development'
        }, {
          name: '正式环境',
          value: 'production'
        }]
      }])
      .then(answers => {
        flowWork(CONFIG[answers.env])
      })
  } else if (CONFIG.development) {
    flowWork(CONFIG['development'])
  } else if (CONFIG.production) {
    flowWork(CONFIG['production'])
  } else {
    errorLog('发布构建程序运行失败，请检查配置文件是否含有 "production" 或 "development" 属性！')
    console.log(chalk.yellow('◎ 请查看详情：') + chalk.blue(` https://gitee.com/zlluGitHub/swd-deploy`))
  }
}

if (CONFIG.model === 'web') {
  startFlowWork(webFlowWork)
} else if (CONFIG.model === 'java') {
  startFlowWork(javaFlowWork)
} else {
  inquirer
    .prompt([{
      type: 'list',
      message: '请选择构建程序种类',
      name: 'program',
      choices: [{
        name: 'WEB前端程序',
        value: 'web'
      }, {
        name: 'JAVA后端程序',
        value: 'java'
      }]
    }])
    .then(answers => {
      if (answers.program === 'web') {
        startFlowWork(webFlowWork)
      } else if (answers.program === 'java') {
        startFlowWork(javaFlowWork)
      } else {
        errorLog(`暂无指定${CONFIG.model}程序部署功能，目前只支持 web 或 java 部署！`)
      }
    })
}
