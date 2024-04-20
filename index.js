#!/usr/bin/env node

const chalk = require('chalk') //命令行颜色
const fs = require('fs')
const CliProgress = require('cli-progress');
const ora = require('ora') // 加载流程动画
const spinner_style = require('./src/spinner_style') //加载动画样式
const shell = require('shelljs') // 执行shell命令
const Client = require('ssh2-sftp-client') // ssh连接服务器
const inquirer = require('inquirer') //命令行交互
// const zipFile = require('compressing') // 压缩zip
// const fs = require('fs') // nodejs内置文件模块
const path = require('path') // nodejs内置路径模块
const colors = require('ansi-colors');

//logs
const defaultLog = log => console.log(chalk.blue(`☀ ${log}`))
const errorLog = log => console.log(chalk.red(`✘ ${log}`))
// const warningLog = log => console.log(chalk.yellow(`◎ ${log}`))
const successLog = log => console.log(chalk.green(`✔ ${log}`))

const SSH = new Client()
 
console.log(chalk.green(`☺ 欢迎使用自动部署工具！`))

let config = {} // 用于保存 inquirer 命令行交互后选择正式|测试版的配置

const getOption = () => {
  const arr = process.argv.slice(2); // 获取命令行参数数组
  const r = arr.reduce((pre, item) => { // 使用reduce方法对参数数组进行处理
    if (item.indexOf("=") !== -1) { // 判断参数是否有等号
      return [...pre, item.split("=")]; // 将带有等号的参数进行分割并添加到结果数组中
    }
    return pre; // 否则返回原结果数组
  }, []);
  if (r.length == 0) {
    return false
  }
  const params = Object.fromEntries(r); // 将结果数组转化为参数对象
  return params; // 返回参数对象
}

let params = getOption()

const pathHierarchy = params['--config'] || '../../' // './'      //脚本到项目的层级  项目/node_modules/deploy-node/index.js

let CONFIG = {};
// let isExitConfigFile = true;
try {
  CONFIG = require(path.resolve(__dirname, `${pathHierarchy}deploy.config.js`)) // 项目配置
} catch (error) {
  if (params['--host'] && params['--password'] && params['--wwwPath'] && params['--localPath']) {
    // 命令行参数优先级最高
    // isExitConfigFile = false
  } else {
    errorLog('请在项目根目录添加 deploy.config.js 配置文件。')
    console.log(colors.grey('参考说明文档中的配置：https://github.com/zlluGitHub/swd-deploy'));
    process.exit() //退出流程
  }
}

//项目打包代码 npm run build 
const buildDist = async () => {
  const loading = ora(defaultLog('开始打包项目')).start()
  loading.spinner = spinner_style[config.loadingStyle || 'arrow4']
  shell.cd(path.resolve(__dirname, pathHierarchy))
  const res = await shell.exec(params['--build'] || config.build || config.buildShell || 'npm run build') //执行shell 打包命令
  loading.stop()
  if (res.code === 0) {
    successLog('项目打包成功!')
    return true
  } else {
    errorLog('项目打包失败, 请重试!')
    process.exit() //退出流程
    return false
  }
}


//连接服务器
const connectSSH = async () => {
  const loading = ora(defaultLog('正在连接服务器')).start()
  loading.spinner = spinner_style[config.loadingStyle || 'arrow4']
  //privateKey 秘钥登录(推荐) 方式一
  //password  密码登录 方式二
  const type = (params['--password'] || config.password) ? 'password' : 'privateKey'
  const data = (params['--password'] || config.password) || config.privateKey
  const opt = {
    host: params['--host'] || config.sshIp || config.host,
    username: params['--username'] || config.username || config.sshUserName || 'root',
    port: params['--port'] || config.port || 22,
    [type]: data,
    tryKeyboard: true,
  }
  // if (config.readyTimeout) {
  opt.readyTimeout = params['--readyTimeout'] || config.readyTimeout || 60000
  // }

  try {
    await SSH.connect(opt)
    successLog('服务器连接成功!')
  } catch (error) {
    errorLog('SSH连接失败! (可能原因: 1:密码不对, 2:privateKey 本机私钥地址不对, 3:服务器未配置本机公钥, 4:服务器未安装 SSH 服务或端口), 5:使用命令参数时, 请检查是否配置了 --key 参数')
    process.exit() //退出流程
  }

  loading.stop()
}


const formatNodePath = (filePath) => {
  // 返回格式化后的路径
  return filePath.replace(/\\/g, '/')
}

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B'; //Bytes
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + '' + sizes[i];
}

const uploadFile = async (localPath, remotePath, stats) => {

  defaultLog(`正在上传 ${localPath} 文件`)

  const b1 = new CliProgress.Bar({
    format: '上传进度：[' + colors.cyan('{bar}') + '] {percentage}% ' + colors.magenta('{size} ') + colors.green('{speed}'),
    // barCompleteChar: '\u2588',
    // barIncompleteChar: '\u2591',
    barCompleteChar: '#',
    barIncompleteChar: '-',
    hideCursor: true
  });

  let totalTransferredW1 = 0;
  let totalTransferredW2 = 0;
  let totalW = 1;

  b1.start(100, 0, {
    speed: "N/A",
    size: '0KB/0KB'
  });

  const startTime = new Date().getTime();
  const timer = setInterval(() => {
    b1.update((((totalTransferredW1 / totalW) * 100).toFixed(2)) * 1, {
      speed: formatBytes(totalTransferredW1 - totalTransferredW2) + '/s',
      size: formatBytes(totalTransferredW1) + '/' + formatBytes(totalW)
    });
    totalTransferredW2 = totalTransferredW1;
  }, 1000)
  // console.log(localPath);
  await SSH.fastPut(localPath, remotePath, {
    step: (totalTransferred, chunk, total) => {
      totalTransferredW1 = totalTransferred;
      totalW = total;
    }
  })

  const endTime = new Date().getTime();

  const time = (endTime - startTime) / 1000;
  b1.update(100, {
    speed: formatBytes(totalW / time) + '/s',
    size: formatBytes(totalW) + '/' + formatBytes(totalW)
  });
  clearInterval(timer)

  b1.stop();
  // loading.stop()
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
      await uploadFile(localFilePath, remoteFilePath, stats)
    } else if (stats.isDirectory()) {
      // console.log(localFilePath,'==> dir');
      await SSH.mkdir(remoteFilePath, true)
      await uploadDirectory(localFilePath, remoteFilePath, stats)
    }
  }
}


const fuh = [',', '、', ';', '；']

const splitPath = (str) => {
  const fgf = fuh.find(item => str.indexOf(item) > -1)
  return str.split(fgf)
}

//传送zip文件到服务器
const uploadZipBySSH = async () => {
  //连接ssh
  await connectSSH()


  try {

    let pathArr = []
    if (params['--localPath']) {
      pathArr = splitPath(params['--localPath'])
    } else {
      const localPaths = config.distFolder || config.localPath || false

      if (!localPaths) throw new Error();

      if (typeof localPaths == 'object') {
        pathArr = localPaths
      } else {
        pathArr = splitPath(localPaths)
      }
    }

    for (let i = 0; i < pathArr.length; i++) {
      const localPath = pathArr[i] //path.resolve(__dirname, pathArr[i])
      const stats = fs.statSync(localPath)
      let wwwPath = params['--wwwPath'] || config.wwwPath
      if (stats.isFile()) {
        if (wwwPath.indexOf('.' == -1)) {
          wwwPath = wwwPath + '/' + path.basename(localPath)
        }
        await uploadFile(localPath, wwwPath)
      } else if (stats.isDirectory()) {
        await SSH.mkdir(wwwPath, true)
        await uploadDirectory(localPath, wwwPath)
        successLog(`文件夹 ${localPath} 中的所有文件已上传成功!`)
      }
    }


  } catch (error) {
    errorLog(error)
    errorLog('上传失败，请检查文件或文件夹路径是否正确!')
    process.exit() //退出流程
  }
  SSH.end(); //断开连接
  // loading.stop()
}

//------------发布程序---------------
const runUploadTask = async () => {
  //打包
  if (params['--build'] || config.build || config.buildShell) {
    await buildDist()
    // if (!res) return
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
// const checkConfig = (conf) => {
//   const checkArr = Object.entries(conf)
//   checkArr.map(it => {
//     const key = it[0]
//     if (conf[key] === '/') { //上传zip前会清空目标目录内所有文件
//       errorLog('buildShell 不能是服务器根目录!')
//       process.exit() //退出流程
//     }
//     if (!conf[key]) {
//       errorLog(`配置项 ${key} 不能为空`)
//       process.exit() //退出流程
//     }
//   })
// }
// console.log(params);

let choices = [];

for (const key in CONFIG) {
  choices.push({
    name: CONFIG[key].title || `发布到 ${params['--host'] || config.sshIp || config.host} 服务器环境`,
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


const initAnswers = async (key) => {

  config = key ? CONFIG[key] : {};
  // config.distFolder = config.distFolder || config.distFolder.replace("/", "");
  //文件夹目录
  // console.log(answers.env);
  const localPaths = params['--localPath'] || config.distFolder || config.localPath || false
  if (!localPaths) {
    errorLog('请配置本地打包目录，或检查 “deploy.config.js” 文件是否在根目录下!')
    process.exit() //退出流程
    // return
  };

  // distDir = path.resolve(__dirname, `${pathHierarchy + config.distFolder}`) //待打包
  // distZipPath = path.resolve(__dirname, `${pathHierarchy + config.distFolder}.zip`) //打包后地址(dist.zip是文件名,不需要更改, 主要在config中配置 PATH 即可)
  // checkConfig(config) // 检查
  await runUploadTask() // 发布
}

// path.resolve(__dirname, 'D:/zx/zxczx')
// 获取执行命令的路径
// const execPath = process.argv[1];

// console.log('当前执行命令的路径:', execPath);
// console.log(path.resolve(__dirname, './'));

// return 

if (params) {

  // if (isExitConfigFile) {
  //   if (!params['--key']) {
  //     errorLog('请指定 --key 参数！')
  //     process.exit() //退出流程 
  //     // return
  //   }
  // }
  let key = params['--key']
  if (key && (!CONFIG[key])) {
    errorLog('请检查 “deploy.config.js” 文件是否配置 --key 参数!')
    process.exit() //退出流程 
  }

  initAnswers(key)
} else {
  params = {}
  // 执行交互后 启动发布程序

  // for (const key in CONFIG) {
  //   // const element = CONFIG[key];
  //    }
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


