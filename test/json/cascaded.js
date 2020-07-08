module.exports.simple = {
    needLogs: true,
    needTrace: true,
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                },
            },
            fields: [
                '*',
                {
                    name: 'latest5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id'
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    }
                }
            ]
        }
    ]
}

module.exports.multiple = {
    needLogs: true,
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
            fields: [       // 对字段做一些精简
                'id',
                'username',
                'avatar',
                'updatedAt=>lastVisitedAt',
                {
                    name: 'latest5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id'      // 这里 $ 指的是 userInfo
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    },
                    fields: [
                        'id',
                        'categoryId',
                        'title',
                        'content',
                        'views',
                        'hearts',
                        {
                            name: 'category',
                            type: 'entity',
                            target: 'Category',
                            query: {
                                where: {
                                    id: '$.categoryId'  // 这里的 $ 指的是单个 blog
                                }
                            },
                            fields: 'id,name'
                        },
                        {
                            name: 'latest5comments',
                            type: 'list',
                            target: 'Comment',
                            query: {
                                where: {
                                    blogId: '$.id'  // 这里的 $ 指的还是单个 blog
                                },
                                order: 'id#desc',
                                size: 5
                            },
                            fields: 'id,content,hearts'
                        }
                    ]
                }
            ]
        }
    ]
}