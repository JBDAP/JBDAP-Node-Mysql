const db = require('./db.js')
const {config,JBDAP} = require('./index.js')
const conn = db.getConn('test_logic')
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

test('测试 onlyIf 条件限制', async () => {
    // expect.assertions(4)
    let json = require('./json/onlyIf.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.getUser.username).toEqual('user11')
})

test('测试 after 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/after.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(res.data.blogInfo.views + 1).toEqual(res.data.newBlogInfo.views)
})

test('测试 method 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/method.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(parseInt(res.data.blog1.content) > 0).toEqual(true)
    expect(res.data.blog2.content).toEqual('2')
})

test('测试 reference 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/reference.js').simple
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(res.data.latest5comments[0].blog.user.id).toEqual(1)
    json = require('./json/reference.js').select
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(res.data.top10blogs[0].categoryId === 2).toEqual(true)
    expect(res.data.top10blogs[0].user.id > 0).toEqual(true)
})
