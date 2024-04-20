/** 
* 用秘钥登录服务器(推荐), 
* 把本机 公钥 .ssh目录下 id_rsa.pub 放服务器 authorized_keys 文件里, 多个电脑公钥换行分开
* private 本机私钥文件地址(需要在服务器用户目录 一般是 ~/.ssh/authorized_keys 配置公钥 并该文件权限为 600, (.ssh文件夹一般默认隐藏)
* 一般 .ssh在用户目录下  cd ~/.ssh/  复制路径放下面 pwd 可查看当前路径 路径用 / 别 \ 例如以下 C:/Users/Administrator/.ssh/id_rsa
**/

module.exports = Object.freeze({
  development: {//测试
    title: "开发环境", //提示标题
    // x[已废弃] sshIp: '10.0.85.100', 
    host: '127.0.0.1',// 新增字段与 sshIp 一致
    port: 22,
     // x[已废弃] sshUserName: 'root',
    username: 'root',
    password: '',
    wwwPath: '',
    // x[已废弃] distFolder: 'src', // 打包后的文件夹 默认 /dist
    localPath: '', // 新增字段与distFolder一致 默认 /dist
    configPath: '', // deploy.config.js文件路径 默认项目根目录(./)
    loadingStyle: 'arrow4', // 打包后的文件夹 默认 /dist
    // x[已废弃] buildShell: '',// 'npm run build', // 自定义打包命令 若为空则会直接部署，不会打包
    build: '',// 'npm run build', // 自定义打包命令 若为空则会直接部署，不会打包
    readyTimeout: 60000 // 超时时间
  },
  production: {//正式
    sshIp: '',
    sshUserName: '',
    password: '',
    wwwPath: '',
    loadingStyle: 'arrow4'
  }
})
