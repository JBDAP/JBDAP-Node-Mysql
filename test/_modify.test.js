const db = require('./db.js')
const {config,JBDAP} = require('./index.js')
const conn = db.getConn('test_modify')
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

test('测试 update 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/update.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.newBlog.content).toEqual('new blog content for user 10')
})

test('测试 delete 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/delete.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    // console.log(res)
    expect(res.data.leftBlogs.total).toEqual(0)
})

test('测试 increase 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/increase.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.oldBlog.hearts + 10).toEqual(res.data.newBlog.hearts)
    expect(res.data.oldBlog.views + 100).toEqual(res.data.newBlog.views)
})

test('测试 decrease 操作', async () => {
    // expect.assertions(4)
    let json = require('./json/decrease.js')
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.oldBlog.hearts - 1).toEqual(res.data.newBlog.hearts)
    expect(res.data.oldBlog.views - 2).toEqual(res.data.newBlog.views)
})
