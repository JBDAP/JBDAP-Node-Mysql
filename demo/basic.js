// 引用
const JBDAP = require('../lib/JBDAP')

// 创建连接
const conn = JBDAP.getConn({
  host: 'localhost',
  user: 'root',
  pass: 'qwer1234',
  dbName: 'jbdap_test'
})

// 参数配置
let config = {
  language: 'zh-cn',  // 以简体中文作为交流语言
  printSql: false,     // 是否打印 sql 语句（方便调试，生产环境可关闭）
}

// JBDAP指令描述
let json = {
  needTrace: true,
  commands: [
    {
      name: 'allUsers',
      type: 'list',
      target: 'User',
    }
  ]
}

// 初始化数据库
const db = require('../test/db.js')
db.resetDB(conn)
  .then(async ()=>{
    console.log('数据库结构初始化成功')
    await JBDAP.manipulate(conn,require('../test/json/insert').initData,config)
    console.log('测试数据填充成功')
    // 执行查询
    let res = await JBDAP.manipulate(conn,json,config)
    console.log(JSON.stringify(res,null,4))
    process.exit(0)
  })
  .catch((err)=>{
    console.log(err)
  })
