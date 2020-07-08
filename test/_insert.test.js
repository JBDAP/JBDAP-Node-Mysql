const db = require('./db.js')
const {config,JBDAP} = require('./index.js')
const conn = db.getConn('test_insert')
let cfg = _.cloneDeep(config)
cfg.printSql = false

beforeAll(async () => {
    await db.resetDB(conn)
})

afterAll(async () => {
    await db.emptyDB(conn)
})

test('测试使用 JBDAP 填充单条数据', async () => {
    expect.assertions(2)
    let json = require('./json/insert.js').single
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.getCount.total).toEqual(3)
    expect(res.data.getEntity.sequence).toEqual(0)
})

test('测试使用 JBDAP 批量填充数据', async () => {
    expect.assertions(1)
    let json = require('./json/insert.js').batch
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.getCount.total).toEqual(10)
})

test('测试使用 JBDAP 添加重复数据', async () => {
    expect.assertions(2)
    let json = {
        needLogs: true,
        isTransaction: true,
        commands: [
            {
                name: 'insertCategory1',
                type: 'create',
                target: 'Category',
                data: {
                    name: '政治',
                },
            },
        ]
    }
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.code).toEqual(500)
    expect(res.message).toContain('Duplicate entry')
})

test('测试使用 JBDAP 初始化完整数据库', async () => {
    expect.assertions(2)
    await db.resetDB(conn)
    let json = require('./json/insert.js').initData
    let res = await JBDAP.manipulate(conn,json,cfg)
    // console.log(res)
    let count = await conn('Comment').count('id as count')
    // console.log(count)
    expect(res.code).toEqual(200)
    expect(count[0].count).toEqual(500)
}, 30000)
