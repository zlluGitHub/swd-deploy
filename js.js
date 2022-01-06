// ssh连接服务器
const node_ssh = require('node-ssh');
const chalk = require('chalk') //命令行颜色
const ora = require('ora') // 加载流程动画
const ssh = new node_ssh();
const spinner_style = require('./src/spinner_style') //加载动画样式

//logs
const defaultLog = log => console.log(chalk.blue(`☀ ${log}`))
const errorLog = log => console.log(chalk.red(`✘ ${log}`))
const warningLog = log => console.log(chalk.yellow(`◎ ${log}`))
const successLog = log => console.log(chalk.green(`✔ ${log}`))


// 配置项
let config = {
  server: {
    host: '10.0.85.56',
    password: 'bigdata',
    username: 'root',
    port: 22,
    tryKeyboard: true,
  },
  project: {
    title: "",
    wwwPath: "",
    buildPath: "",
    git: {
      url: "",
      branch: ""
    },
    order: {
      build: "",
      run: "",
      stop: ""
    }
  }
}
console.log(chalk.green(`☺ 欢迎使用自动部署工具！`))

//连接服务器
const connectSSH = () => {
  return new Promise((resolve, reject) => {
    const loading = ora(defaultLog('正在连接服务器')).start();
    loading.spinner = spinner_style['arrow4']
    // 链接远程服务器
    ssh.connect(config.server).then(e => {
      loading.stop()
      successLog('SSH连接成功!')
      resolve()
    }).catch(err => {
      loading.stop();
      errorLog('SSH连接失败! (可能原因: 1:密码不对, 2:privateKey 本机私钥地址不对, 3:服务器未配置本机公钥')
      process.exit(0);
    });
  });
}

const execShell = (command, cwd) => {
  return new Promise(async (resolve, reject) => {
    ssh.execCommand(command, { cwd }).then((result) => {
      if (result.stdout) {
        // console.log('远程STDOUT输出: ' + result.stdout)
        console.log(result.stdout)
      }
      if (result.stderr) {
        // console.log('远程STDERR输出: ' + result.stderr)
        errorLog(result.stderr)
      }
      if (!result.code) {
        resolve()
      } else {
        // errorLog(`远程 ${command} 命令执行失败，程序已终止运行!`);
        process.exit(0);
      }
    });
  });
}

(async () => {
  await connectSSH()
  await execShell('ll', '/data')
  process.exit(0);
})()
