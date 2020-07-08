// 测试更新数据
module.exports = {
    commands: [
        {
            name: 'updateBlogs',
            type: 'update',
            target: 'Blog',
            query: {
                where: {
                    userId: 10,
                }
            },
            data: {
                content: 'new blog content for user 10',
            }
        },
        {
            name: 'newBlog',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    userId: 10
                }
            }
        }
    ]
}