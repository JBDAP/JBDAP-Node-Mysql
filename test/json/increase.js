// 测试原子加法运算
module.exports = {
    commands: [
        {
            name: 'oldBlog',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    userId: 8,
                }
            },
        },
        {
            name: 'shareBonus',
            type: 'increase',
            target: 'Blog',
            query: {
                where: {
                    userId: 8,
                }
            },
            data: {
                hearts: 10,
                views: 100
            }
        },
        {
            name: 'newBlog',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    userId: 8,
                }
            },
        },
    ]
}