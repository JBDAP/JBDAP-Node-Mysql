// 引用
const JBDAP = require('../lib/JBDAP')

// 创建连接
const conn = JBDAP.getConn({
  host: 'localhost',
  user: 'root',
  pass: 'qwer1234',
  dbName: 'jbdap_test'
})

// 定义一个 dispatcher 调度器函数
async function dispatcher(user,conn,name,data,lang) {
  // 服务端函数名
  console.log('server-side function name:',name)
  // 接收到的数据
  console.log('data:',JSON.stringify(data,null,4))
  // 根据函数名执行操作
  switch (name) {
      case 'reset_user_pass': {
          // 修改密码，注意 conn 参数是当前 knex 数据库连接实例，可以直接拿来使用
          await conn('User').where('id','=',data.userId).update({ password: 'newpass' })
          // 返回函数执行结果，此结果会返回给前端
          return 'success'
      }
  }
  return 'ok'
}

// 参数配置
let config = {
  language: 'zh-cn',  // 以简体中文作为交流语言
  printSql: true,     // 是否打印 sql 语句（方便调试，生产环境可关闭）
  dispatcher
}

// JBDAP指令描述
let json = {
  commands: [
      {
          name: 'activeUserIds',
          type: 'distinct',       // 指明是 distinct 查询
          target: 'Blog',
          fields: [
            'userId',
          ]
      }
  ]
}

// 初始化数据库
const db = require('../test/db.js')
db.resetDB(conn)
  .then(async ()=>{
    console.log('数据库结构初始化成功')
    let cfg = _.cloneDeep(config)
    cfg.printSql = false
    await JBDAP.manipulate(conn,require('../test/json/insert').initData,cfg)
    console.log('测试数据填充成功')
    // 执行查询
    let res = await JBDAP.manipulate(conn,json,config)
    // let res = await conn.from('Blog').distinct(['userId'])
    console.log(JSON.stringify(res,null,4))
    process.exit(0)
  })
  .catch((err)=>{
    console.log(err)
  })
