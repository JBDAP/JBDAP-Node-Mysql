// 测试事务
module.exports.success = {
    isTransaction: true,
    commands: [
        {
            name: 'blogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 8
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        {
            name: 'comments',
            type: 'values',
            target: 'Comment',
            query: {
                where: {
                    'blogId#in': '/blogs.ids'
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        {
            name: 'delComments',
            type: 'delete',
            target: 'Comment',
            query: {
                where: {
                    'id#in': '/comments.ids'
                }
            }
        },
        {
            name: 'delBlogs',
            type: 'delete',
            target: 'Blog',
            query: {
                where: {
                    userId: 8
                }
            }
        },
    ]
}

module.exports.check = {
    commands: [
        {
            name: 'countBlogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 8
                }
            },
            fields: [
                'count#id=>total'
            ]
        },
    ]
}

module.exports.beforeFail = {
    needLogs: true,
    commands: [
        {
            name: 'old',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    'userId': 1
                }
            },
        },
    ]
}

module.exports.fail = {
    language: 'zh-cn',
    isTransaction: true,
    needLogs: true,
    needTrace: true,
    commands: [
        {
            name: 'increaseHearts',
            type: 'increase',
            target: 'Blog',
            query: {
                where: {
                    'userId': 1
                }
            },
            data: {
                hearts: 1
            }
        },
        {
            name: 'insertUser',
            type: 'create',
            target: 'User',
            data: {
                username: 'user10',
                password: 'password10',
            }
        }
    ]
}

module.exports.afterFail = {
    needLogs: true,
    commands: [
        {
            name: 'new',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    'userId': 1
                }
            },
        },
    ]
}
