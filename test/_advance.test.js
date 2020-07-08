const db = require('./db.js')
const {config,JBDAP} = require('./index.js')
const conn = db.getConn('test_advance')
let cfg = _.cloneDeep(config)
cfg.printSql = false

beforeAll(async () => {
    await db.resetDB(conn)
    let json = require('./json/insert.js').initData
    await JBDAP.manipulate(conn,json,cfg)
    console.log('数据初始化成功')
}, 30000)

afterAll(async () => {
    await db.emptyDB(conn)
})

test('测试事务支持及日志和错误跟踪', async () => {
    // expect.assertions(4)
    // 成功例子
    let json = require('./json/transaction.js').success
    let res = await JBDAP.manipulate(conn,json,config)
    console.log(res)
    json = require('./json/transaction.js').check
    res = await JBDAP.manipulate(conn,json,config)
    console.log(res)
    expect(res.data.countBlogs.total).toEqual(0)
    // 失败例子
    json = require('./json/transaction.js').beforeFail
    res = await JBDAP.manipulate(conn,json,config)
    let bh = res.data.old.hearts
    json = require('./json/transaction.js').fail
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    // 日志
    expect(_.isArray(res.logs)).toEqual(true)
    expect(res.logs[res.logs.length-1]).toEqual('- JBDAP 任务失败')
    // 错误追踪
    expect(res.trace.indexOf('[TransactionError]: 解析或执行事务失败 <=') === 0).toEqual(true)
    json = require('./json/transaction.js').afterFail
    res = await JBDAP.manipulate(conn,json,config)
    let ah = res.data.new.hearts
    // 回滚验证
    expect(bh).toEqual(ah)
})

test('测试服务端函数', async () => {
    // expect.assertions(4)
    let json = require('./json/function.js').call
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    json = require('./json/function.js').check
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(res.data.userInfo.password).toEqual('newpass')
})
