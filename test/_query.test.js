const db = require('./db.js')
const {config,JBDAP} = require('./index.js')
const conn = db.getConn('test_query')
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

test('测试 where 查询', async () => {
    expect.assertions(4)
    // 简单查询
    let json = require('./json/where.js').simple
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.code).toEqual(200)
    let query = await conn.select('id').from('Blog').where('views','>=',500).andWhere('hearts','>=',50)
    // console.log(query)
    expect(res.data.goodBlogs.length).toEqual(query.length)
    // 复杂查询
    json = require('./json/where.js').complex
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.code).toEqual(200)
    query = await conn.select('id').from('Blog').whereRaw(
        `userId = ?
         and views >= ?
         and (
            title like ?
            or 
            (
                content like ?
                and
                createdAt >= ?
            )
         )
         and not (
             hearts <= ?
             and
             views <= ?
         )
        `,
        [
            1,
            100,
            'blog%',
            '%user%',
            '2019-05-01 14:30:00',
            10,
            50
        ]
    )
    // console.log(query)
    expect(res.data.someBlogs.length).toEqual(query.length)
})

test('测试 fields 定义', async () => {
    expect.assertions(6)
    // 默认（未指定）
    let json = require('./json/fields.js').default
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(Object.keys(res.data.firstCategory).length).toEqual(5)
    // 字符串格式定义
    json = require('./json/fields.js').string
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(Object.keys(res.data.firstCategory).length).toEqual(5)
    expect(Object.keys(res.data.secondCategory).length).toEqual(3)
    // 数组格式定义
    json = require('./json/fields.js').array
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(Object.keys(res.data.allUsers[0]).length).toEqual(3)
    // 别名
    json = require('./json/fields.js').alias
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(Object.keys(res.data.allUsers[0]).length).toEqual(4)
    expect(Object.keys(res.data.allUsers[0]).indexOf('lastVisitedAt') >= 0).toEqual(true)
})

test('测试分页查询', async () => {
    expect.assertions(2)
    // list 查询
    let json = require('./json/paging.js').list
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.allUsers.length).toEqual(1)
    // values 查询
    json = require('./json/paging.js').values
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.allUsers.total).toEqual(1)
})

test('测试排序', async () => {
    expect.assertions(2)
    // 单个条件排序
    let json = require('./json/order.js').single
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    expect(res.data.someBlogs[0].views).toEqual(res.data.mostPopular.maxView)
    // 多个条件排序
    json = require('./json/order.js').multiple
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    let query = await conn.select('*').from('Blog').orderBy([{ column: 'views', order: 'desc' }, { column: 'hearts', order: 'desc' }]).limit(10)
    // console.log(query)
    expect(res.data.someBlogs[0].id).toEqual(query[0].id)
})

test('测试 values 取值', async () => {
    // expect.assertions(2)
    // 运算取值
    let json = require('./json/values.js').calculate
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    let query = await conn.count('id as count').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.totalBlogs).toEqual(query[0].count)
    query = await conn.sum('hearts as totalHearts').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.totalHearts).toEqual(query[0].totalHearts)
    query = await conn.max('views as maxViews').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.maxViews).toEqual(query[0].maxViews)
    query = await conn.min('views as minViews').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.minViews).toEqual(query[0].minViews)
    query = await conn.avg('hearts as avgHearts').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.avgHearts).toEqual(query[0].avgHearts)
    // 逻辑处理
    json = require('./json/values.js').function
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    query = await conn.select('*').from('Blog').whereRaw(`userId = ?`, [1]).orderBy([{ column: 'id', order: 'desc' }])
    // console.log(query)
    expect(res.data.blogStat.latestTitle).toEqual(query[0].title)
    let ids = _.uniq(_.map(query,'id'))
    expect(res.data.blogStat.blogIds).toEqual(ids)
    let fields = ['id','title','content','hearts']
    let result = []
    _.forEach(query, (item) => {
        // 拷贝属性
        let temp = {}
        _.forEach(fields, (field) => {
            temp[field] = _.cloneDeep(item[field])
        })
        result.push(temp)
    })
    if (result.length === 0) result = null
    expect(res.data.blogStat.list).toEqual(result)
})

test('测试级联查询', async () => {
    // expect.assertions(2)
    // 简单实例
    let json = require('./json/cascaded.js').simple
    let res = await JBDAP.manipulate(conn,json,config)
    // console.log(res)
    let query = await conn.select('*').from('Blog').where('userId','=',1).orderBy([{ column: 'updatedAt', order: 'desc' }]).limit(5)
    expect(res.data.userInfo.latest5blogs[0].title).toEqual(query[0].title)
    // 多级级联
    json = require('./json/cascaded.js').multiple
    res = await JBDAP.manipulate(conn,json,config)
    // console.log(JSON.stringify(res,null,4))
    expect(res.data.userInfo.latest5blogs[0].category.name !== undefined).toEqual(true)
    expect(res.data.userInfo.latest5blogs[0].latest5comments[0].content !== undefined).toEqual(true)
})
