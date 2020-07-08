// 测试查询结果引用
module.exports.simple = {
    commands: [
        {
            name: 'userBlogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        {
            name: 'latest5comments',
            type: 'list',
            target: 'Comment',
            query: {
                where: {
                    'blogId#in': '/userBlogs.ids'
                },
                order: 'id#desc',
                size: 5
            },
            fields: [
                '*',
                {
                    name: 'blog',
                    type: 'entity',
                    target: 'Blog',
                    query: {
                        where: {
                            id: '$.blogId'
                        }
                    },
                    fields: [
                        '*',
                        {
                            name: 'user',
                            type: 'entity',
                            target: 'User',
                            query: {
                                where: {
                                    id: '$.userId'
                                }
                            }
                        }
                    ]
                }
            ]
        }
    ]
}

// 测试查询结果引用
module.exports.select = {
    needLogs: true,
    commands: [
        {
            name: 'newBlogs',
            type: 'values',
            target: 'Blog',
            query: {
                size: 10,
                page: 10
            },
            fields: [
                'pick#userId=>userIds',
                'clone#*=>list'
            ]
        },
        {
            name: 'newUsers',
            type: 'list',
            target: 'User',
            query: {
                where: {
                    'id#in': '/newBlogs.userIds'
                }
            }
        },
        {
            name: 'top10blogs',
            type: 'list',
            target: '/newBlogs.list',
            query: {
                where: {
                    'categoryId': 2
                }
            },
            fields: [
                '*',
                {
                    name: 'user',
                    type: 'entity',
                    target: '/newUsers',
                    query: {
                        where: {
                            'id': '$.userId'
                        }
                    }
                }
            ]
        }
    ]
}