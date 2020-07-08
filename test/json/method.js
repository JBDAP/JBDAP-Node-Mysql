// 测试更新数据
module.exports = {
    commands: [
        {
            name: 'updateBlog1',
            type: 'update',
            target: 'Blog',
            query: {
                where: {
                    id: 1,
                }
            },
            data: {
                content: 'JBDAP.fn.timestamp()',
            }
        },
        {
            name: 'blog1',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    id: 1,
                }
            },
        },
        {
            name: 'updateBlog2',
            type: 'update',
            target: 'Blog',
            query: {
                where: {
                    id: 2,
                }
            },
            data: {
                content: 'JBDAP.fn.plusInt(/blog1.id,1)',
            }
        },
        {
            name: 'blog2',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    id: 2,
                }
            },
        },
    ]
}