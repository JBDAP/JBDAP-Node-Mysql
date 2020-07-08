// 测试顶层执行服务端函数
module.exports.call = {
    needTrace: true,
    commands: [
        {
            name: 'resetUserPass',
            type: 'function',
            target: 'reset_user_pass',
            data: {
                userId: 1
            }
        }
    ]
}

module.exports.check = {
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
        },
    ]
}