// 测试 onlyIf 条件限制
module.exports = {
    commands: [
        {
            return: false,
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    username: 'user11'
                }
            },
            fields: 'id'
        },
        {
            name: 'newUser',
            type: 'create',
            target: 'User',
            onlyIf: {
                '/userInfo#isNull': true
            },
            data: {
                username: 'user11',
                password: 'password11',
                gender: 'FEMALE',
            }
        },
        {
            name: 'getUser',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    username: 'user11'
                }
            },
        },
    ]
}