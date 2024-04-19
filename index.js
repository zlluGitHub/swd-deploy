#!/usr/bin/env node

const pathHierarchy = './'// '../../'     //脚本到项目的层级  项目/node_modules/deploy-node/index.js
//logs
const defaultLog = log => console.log(chalk.blue(`☀ ${log}`))
const errorLog = log => console.log(chalk.red(`✘ ${log}`))
// const warningLog = log => console.log(chalk.yellow(`◎ ${log}`))
const successLog = log => console.log(chalk.green(`✔ ${log}`))
const fs = require('fs')
const chalk = require('chalk') //命令行颜色
const ora = require('ora') // 加载流程动画
const spinner_style = require('./src/spinner_style') //加载动画样式
const shell = require('shelljs') // 执行shell命令
const Client = require('ssh2-sftp-client') // ssh连接服务器
const inquirer = require('inquirer') //命令行交互
// const zipFile = require('compressing') // 压缩zip
// const fs = require('fs') // nodejs内置文件模块
const path = require('path') // nodejs内置路径模块
const SSH = new Client()
let CONFIG = {};
try {
  CONFIG = require(`${pathHierarchy}deploy.config.js`) // 项目配置
} catch (error) {
  errorLog('请在项目根目录添加 deploy.config.js 配置文件, 参考说明文档中的配置')
  process.exit() //退出流程
}

console.log(chalk.green(`☺ 欢迎使用自动部署工具！`))

let config = {} // 用于保存 inquirer 命令行交互后选择正式|测试版的配置


/**
 * 获取命令行参数并返回对象
 * @returns {Object} 参数对象
 */
const getOption = () => {
  const arr = process.argv.slice(2); // 获取命令行参数数组
  const r = arr.reduce((pre, item) => { // 使用reduce方法对参数数组进行处理
    if (item.indexOf("=") !== -1) { // 判断参数是否有等号
      return [...pre, item.split("=")]; // 将带有等号的参数进行分割并添加到结果数组中
    }
    return pre; // 否则返回原结果数组
  }, []);
  const params = Object.fromEntries(r); // 将结果数组转化为参数对象
  return params; // 返回参数对象
}


//项目打包代码 npm run build 
const buildDist = async () => {
  const loading = ora(defaultLog('开始打包项目')).start()
  loading.spinner = spinner_style[config.loadingStyle || 'arrow4']
  shell.cd(path.resolve(__dirname, pathHierarchy))
  const res = await shell.exec(config.buildShell || 'npm run build') //执行shell 打包命令
  loading.stop()
  if (res.code === 0) {
    successLog('项目打包成功!')
  } else {
    errorLog('项目打包失败, 请重试!')
    process.exit() //退出流程
  }
}


//连接服务器
const connectSSH = async () => {
  const loading = ora(defaultLog('正在连接服务器')).start()
  loading.spinner = spinner_style[config.loadingStyle || 'arrow4']
  //privateKey 秘钥登录(推荐) 方式一
  //password  密码登录 方式二
  const type = config.password ? 'password' : 'privateKey'
  const data = config.password || config.privateKey
  const opt = {
    host: config.sshIp,
    username: config.sshUserName,
    port: config.port || 22,
    [type]: data,
    tryKeyboard: true,
  }
  if (config.readyTimeout) {
    opt.readyTimeout = config.readyTimeout
  }

  try {
    // await SSH.connect(opt)
    await SSH.connect({
      // host: '127.0.0.1',
      // port: '8080',
      // username: 'username',
      // password: '******'
      ...opt
    })
    successLog('服务器连接成功!')
  } catch (error) {
    errorLog('SSH连接失败! (可能原因: 1:密码不对, 2:privateKey 本机私钥地址不对, 3:服务器未配置本机公钥')
    process.exit() //退出流程
  }

  loading.stop()
}


const formatNodePath = (filePath) => {
  // 返回格式化后的路径
  return filePath.replace(/\\/g, '/')
}

const uploadFile = async (localPath, remotePath) => {
  const loading = ora(defaultLog(`正在上传 ${localPath} 文件`)).start()
  // loading.spinner = spinner_style['dots']
  await SSH.fastPut(localPath, remotePath, {
    // step: (totalTransferred, chunk, total) => {
    //   // this.laterSize = totalTransferred + this.uploadSize
    // }
  })
  loading.stop()
  successLog(`文件 ${localPath} 上传成功!`)
}

const uploadDirectory = async (localDir, remoteDir) => {

  const files = fs.readdirSync(localDir)

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i]

    const localFilePath = formatNodePath(path.join(localDir, fileName))
    const remoteFilePath = formatNodePath(path.join(remoteDir, fileName))

    const stats = fs.statSync(localFilePath)
    if (stats.isFile()) {
      await uploadFile(localFilePath, remoteFilePath)
    } else if (stats.isDirectory()) {
      // console.log(localFilePath,'==> dir');
      await SSH.mkdir(remoteFilePath, true)
      await uploadDirectory(localFilePath, remoteFilePath)
    }
  }
}

//传送zip文件到服务器
const uploadZipBySSH = async () => {
  //连接ssh
  await connectSSH()

  try {

    const stats = fs.statSync(config.distFolder)
    if (stats.isFile()) {
      await uploadFile(config.distFolder, config.wwwPath)
    } else if (stats.isDirectory()) {
      await SSH.mkdir(config.wwwPath, true)
      await uploadDirectory(config.distFolder, config.wwwPath)
      successLog(`文件夹 ${config.distFolder} 中的所有文件已上传成功!`)
    }

    SSH.end(); //断开连接
  } catch (error) {
    errorLog(error)
    errorLog('上传失败!')
    process.exit() //退出流程
  }
  // loading.stop()
}

//------------发布程序---------------
const runUploadTask = async () => {
  //打包
  if (config.buildShell) {
    await buildDist()
  }

  await uploadZipBySSH()
  successLog('大吉大利, 部署成功！ヾ(@^▽^@)ノ')
  process.exit()
}

// 开始前的配置检查
/**
 * 
 * @param {Object} conf 配置对象
 */
const checkConfig = (conf) => {
  const checkArr = Object.entries(conf)
  checkArr.map(it => {
    const key = it[0]
    if (conf[key] === '/') { //上传zip前会清空目标目录内所有文件
      errorLog('buildShell 不能是服务器根目录!')
      process.exit() //退出流程
    }
    if (!conf[key]) {
      errorLog(`配置项 ${key} 不能为空`)
      process.exit() //退出流程
    }
  })
}


let choices = [];

for (const key in CONFIG) {
  choices.push({
    name: CONFIG[key].title || `发布到 ${CONFIG[key].sshIp} 服务器环境`,
    value: key
  })
};

if (choices.length === 0) {
  choices = [{
    name: '测试环境',
    value: 'development'
  }, {
    name: '正式环境',
    value: 'production'
  }]
}

const initAnswers = (key) => {
  config = CONFIG[key];
  // config.distFolder = config.distFolder || config.distFolder.replace("/", "");
  //文件夹目录
  // console.log(answers.env);

  if (!config.distFolder) {
    errorLog('本地打包目录不得为空!')
    process.exit() //退出流程
  };

  distDir = path.resolve(__dirname, `${pathHierarchy + config.distFolder}`) //待打包
  distZipPath = path.resolve(__dirname, `${pathHierarchy + config.distFolder}.zip`) //打包后地址(dist.zip是文件名,不需要更改, 主要在config中配置 PATH 即可)
  checkConfig(config) // 检查
  runUploadTask() // 发布
}

const params = getOption()

if (params['--key']) {
  initAnswers(params['--key'])
} else {
  // 执行交互后 启动发布程序
  inquirer
    .prompt([{
      type: 'list',
      message: '请选择发布环境',
      name: 'env',
      choices
    }])
    .then(answers => {
      initAnswers(answers.env)
    })
}

