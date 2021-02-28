# swd-deploy 
一个简单方便的前端自动部署工具，可通过使用 npm 将包安装到你的项目中。

## 快速安装
```
npm i swd-deploy --save
```
## 快速使用
### 第一步
在你的项目 package.json 文件中的 scripts 字段中添加如下内容：

```
"deploy": "node ./node_modules/swd-deploy/index"
```
例如：

```json
{
  "scripts": {
    "deploy": "node ./node_modules/swd-deploy/index",
  }
}

```
### 第二步

在你项目根目录添加 `deploy.config.js` 文件内容如下:
```js

module.exports = Object.freeze({
  development: {//测试
    sshIp: 'xx.xxx.xx.xx', // ssh地址 服务器地址
    sshUserName: 'root', // ssh 用户名
    //登录方式 (二选一, 不用的方式注释掉)
    // privateKey: 'C:/Users/Administrator/.ssh/id_rsa', //方式一 使用秘钥登录服务器
    password: 'xxxxxx',  //方式二 用密码连接服务器
    wwwPath: '/usr/local/nginx/html/', // 需要上传的服务器目录地址 如 /usr/local/nginx/html/prodName
    distFolder: 'dist', // 打包后的文件夹 默认 /dist
    loadingStyle: 'arrow4', // 打包后的文件夹 默认 /dist
    buildShell: 'npm run build' // 自定义打包命令 若为空则会直接部署，不会打包
  },
  production: {//正式
    sshIp: 'xx.xxx.xx.xx',
    sshUserName: 'root',
    password: 'xxxxxx',
    wwwPath: '/usr/local/nginx/html1/',
    loadingStyle: 'arrow4',
    buildShell: 'npm run build' 
  }
})
```
**用秘钥登录服务器(推荐)**
* 把本机 公钥 .ssh目录下 id_rsa.pub 放服务器 authorized_keys 文件里, 多个电脑公钥换行分开
* private 本机私钥文件地址(需要在服务器用户目录 一般是 ~/.ssh/authorized_keys 配置公钥 并该文件权限为 600, (.ssh文件夹一般默认隐藏)
* 一般 .ssh在用户目录下  cd ~/.ssh/  复制路径放下面 pwd 可查看当前路径 路径用 / 别 \ 例如以下 C:/Users/Administrator/.ssh/id_rsa

然后执行：
```
npm run deploy
```
就可以部署了！
