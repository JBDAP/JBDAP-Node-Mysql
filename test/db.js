const jbdap = require('../src/JBDAP')
const helper = jbdap.helper

const getConn = (dbName) => {
    return jbdap.getConn({
        host: 'localhost',
        user: 'root',
        pass: 'qwer1234',
        dbName: dbName
    })
}

const files = ['user','category','blog','comment','subscription']

async function initDB(conn) {
    // 创建数据表
    for (let i=0; i<files.length; i++) {
        let model = require(`./model/${files[i]}`)
        try {
            await helper.createTable(conn,model)
        }
        catch (err) {
            console.log(err)
        }
    }
}

async function emptyDB(conn) {
    // 清空数据表，注意与创建顺序相反，因为外键约束
    for (let i=files.length-1; i>=0; i--) {
        let model = require(`./model/${files[i]}`)
        // console.log(model)
        try {
            await helper.dropTable(conn,model.name)
        }
        catch (err) {
            console.log(err)
        }
    }
}

async function resetDB(conn) {
    await emptyDB(conn)
    await initDB(conn)
    console.log('数据库重置完毕')
}

module.exports = {
    getConn,
    initDB,
    emptyDB,
    resetDB,
}