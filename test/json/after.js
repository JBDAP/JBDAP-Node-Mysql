// 测试 after 指令
module.exports = {
    needTrace: true,
    commands: [
        {
            name: 'blogInfo',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    id: 1
                }
            },
            after: [
                {
                    name: 'updateViews',
                    type: 'increase',
                    target: 'Blog',
                    query: {
                        where: {
                            id: 1
                        }
                    },
                    data: {
                        views: 1
                    }
                }
            ]
        },
        {
            name: 'newBlogInfo',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    id: 1
                }
            },
        }
    ]
}