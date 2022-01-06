/** 
* 用秘钥登录服务器(推荐), 
* 把本机 公钥 .ssh目录下 id_rsa.pub 放服务器 authorized_keys 文件里, 多个电脑公钥换行分开
* private 本机私钥文件地址(需要在服务器用户目录 一般是 ~/.ssh/authorized_keys 配置公钥 并该文件权限为 600, (.ssh文件夹一般默认隐藏)
* 一般 .ssh在用户目录下  cd ~/.ssh/  复制路径放下面 pwd 可查看当前路径 路径用 / 别 \ 例如以下 C:/Users/Administrator/.ssh/id_rsa
**/

module.exports = Object.freeze({
  development: {//测试
    sshIp: '', // ssh地址 服务器地址
    sshUserName: '', // ssh 用户名
    //登录方式 (二选一, 不用的方式注释掉)
    // privateKey: 'C:/Users/Administrator/.ssh/id_rsa', //方式一 使用秘钥登录服务器
    password: '',  //方式二 用密码连接服务器
    wwwPath: '', // 需要上传的服务器目录地址 如 /usr/local/nginx/html/prodName
    distFolder: '', // 打包后的文件夹 默认 /dist
    loadingStyle: 'arrow4',
    buildShell: 'npm run build', // 自定义打包命令 若为空则会直接部署，不会打包
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