# JBDAP-Node-Mysql 文档

<div style="height:20px;"></div>

# 一、简介

> **JBDAP-Node-Mysql** 是 JBDAP 在 nodejs 环境下针对 Mysql 数据库的官方实现，使用它可以快速开发一个基于 Mysql 的数据库应用（可以是 Native 或者 B/S 或者 C/S 架构），操作数据的后端代码量可以减少 80% 以上。

如果您的项目采用了其它数据库，我们也有相应的实现可供使用：

- Sqlite
  - Github 仓库
  - npm 包

也欢迎您编写更多其它数据库的 JBDAP 实现贡献给社区。

<div style="height:20px;"></div>

# 二、基本用法

***注：支持 nodejs 8 及更高版本***

### **1、安装**

~~~
npm i jbdap-mysql --save

// 或者

yarn add jbdap-mysql
~~~
注意，因为包内自带了 mysql2 引擎，所以无需单独安装

### **2、示例代码**

我们假定在本地 Mysql 服务器有一个叫做 jbdap_test 的数据库，里面有个 [User] 表已经填充了一些数据

~~~
// 引用
const JBDAP = require('jbdap-mysql')

// 创建连接
const conn = JBDAP.getConn({
    host: 'localhost',
    user: 'root',
    pass: '***********',
    dbName: 'jbdap_test'
})

// 参数配置
let config = {
    language: 'zh-cn',  // 以简体中文作为交流语言
    printSql: true,     // 是否打印 sql 语句（方便调试，生产环境可关闭）
}

// JBDAP指令描述（取出全部用户列表）
let json = {
    commands: [
        {
            name: 'allUsers',
            type: 'list',
            target: 'User',
        }
    ]
}

// 执行查询
JBDAP.manipulate(conn,json,config)
    .then((res)=>{
        console.log(JSON.stringify(res,null,4))
    })
    .catch((err)=>{
        console.log(err)
    })

// 打印出的返回结果如下
{
    "code": 200,
    "message": "ok",
    "data": {
        "allUsers": [
            {
                "id": 1,
                "username": "user1",
                "password": "password1",
                "avatar": null,
                "email": null,
                "gender": "FEMALE",
                "createdAt": "2020-07-08 14:42:44",
                "updatedAt": "2020-07-08 14:42:44"
            },
            ...
        ]
    }
}
~~~

很简单吧，我们只需要改变 json 的内容，就可以使用上述代码进行 JBDAP 规范下的任何数据库查询或者操作。

<div style="height:20px;"></div>

# 三、更多能力

由于 JBDAP-Node-Mysql 是对 JBDAP 协议的实现，因此它的能力其实也就是 JBDAP 的能力，在查看实例代码之前，我们先看一下 JBDAP 的能力全景图：

- 创建数据
  - 单条、多条插入
  - 大数据量自动分批插入
- 查询数据
  - 多种查询类型
    - entity - 查询单条记录
    - list - 查询多条记录
    - values - 对符合条件的记录进行统计和简单计算
  - query - 查询约束
    - where 条件 - 可以支持单表任意复杂查询，不支持联合查询
    - fields - 指定及重命名字段
    - size/page - 分页支持
    - order - 排序
  - cascaded 级联查询 - 支持多层级联查询
- 操作已有数据
  - 操作类型
    - update - 部分或全部更新记录
    - increase - 原子更新操作之增量
    - decrease - 原子更新操作之减少
    - delete - 删除记录
  - query - 操作条件约束
    - where 条件 - 可以支持单表任意复杂查询，不支持联合查询
    - limit/offset 支持以 size/page 的形式实现
- 逻辑能力
  - multiple - 顺序执行多条指令
  - onlyIf - 指令执行的前置条件约束
  - after - 后续指令操作（支持多条）
  - method - 服务端内置方法实现特殊操作或值的输入
  - reference - 指令间的结果集引用
- 高级能力
  - 事务支持 - 成功或回滚
  - 服务端函数 - 对于复杂逻辑的操作通过单独编写操作函数来实现
  - 日志输出 - 前端可以查看完整处理日志
  - 错误跟踪 - 前端可以查看返回的错误跟踪以方便调试
  - 身份校验
  - 权限控制
  - 敏感数据屏蔽
  - 缓存支持

<div style="height:20px;"></div>

# 四、实例代码手册

### **[请参见这里（建议新窗口打开）](https://github.com/JBDAP/JBDAP-Node-Mysql/blob/master/doc/CODESBOOK.md)**

<div style="height:20px;"></div>

# 五、完整 API 说明

> 说实话，如果你能看完前面的实例代码手册，那么已经可以满足正常开发需要了。以下 API 可以帮助你更好的理解 JBDAP 实现的逻辑结构，对于想要开发自己 JBDAP 引擎的朋友来说会比较有用。先了解大体结构之后再去看源码效率会更高一些。

### let JBDAP = require('jbdap-mysql')
- version - String - 当前版本
- getConn - Function - 生成一个 Mysql 数据库连接
  - params - 参数
    - dbFile - String - 数据库文件的完整路径，建议通过 path.join() 方式生成
  - return - 返回一个 knex 连接实例
- knex - Object - 对于 knex 包的引用，方便用户自己创建其它数据库连接
- manipulate - Function - JBDAP 的核心方法，通过它来执行 JBDAP json 描述中的指令
  - params - 参数
    - conn - Object - knex 数据库连接实例，可以通过 getConn 函数获得
    - json - Object - 将要被执行的 JBDAP 指令描述内容
    - config - Object - 配套参数
      - printSql? - Boolean - 是否在控制台打印出 sql 语句，默认为 true
      - language? - String - 系统交互使用的语言（目前只支持简体中文和英语），默认为 'zh-cn'
      - recognizer? - async Function - 通过 json 中的 Security 信息完成用户身份识别
      - doorman? - async Function - 通过用户身份控制其对数据的访问权限
      - scanner? - async Function - 对即将返回前端的数据进行扫描，防止敏感数据泄露（比如 password/token 等字段）
      - cacher? - async Function - 缓存操作模块，提升系统处理能力
      - dispatcher? - async Function - 服务端函数调度器，如果使用服务端函数功能就必须配置它
  - return - Object - 返回执行结果，成员如下：
    - code - Integer - 状态码
    - message - String - 执行结果或者错误提示信息（如果失败的话）
    - data - Object - 每个 property 对应一条指令的名字
    - logs? - Array - 执行过程日志
    - trace? - String - 错误跟踪信息
- helper - Object - Mysql 数据库快捷操作工具
  - createTable - async Function - 根据 schema 创建数据表
    - params - 参数
      - conn - knex 连接实例
      - schema - Object - 数据表结构描述 json 内容，具体结构参见下文
      - lang - String - 默认交互提示信息语言
  - dropTable - async Function - 删除数据表
    - params - 参数
      - conn - knex 连接实例
      - tableName - String - 数据表名
      - lang - String - 默认交互提示信息语言

以上就是全部的 API 了。

<div style="height:20px;"></div>

## Enjoy It :-)