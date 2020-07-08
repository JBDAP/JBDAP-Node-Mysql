const JBDAP = require('../src/JBDAP.js')

async function dispatcher(user,conn,name,data,lang) {
    // 执行函数
    console.log('server-side function name:',name)
    console.log('data:',JSON.stringify(data,null,4))
    console.log('user:',JSON.stringify(user,null,4))
    if (name === 'reset_user_pass') {
        return await conn('User').where('id','=',data.userId).update({ password: 'newpass' })
    }
    return 'ok'
}

let config = {
    dispatcher,
    printSql: true,
    language: 'zh-cn'
}

module.exports = {
    config,
    JBDAP,
}
