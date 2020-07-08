// 测试原子减法运算
module.exports = {
    commands: [
        {
            name: 'oldBlog',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    userId: 5,
                }
            },
        },
        {
            name: 'shareBonus',
            type: 'decrease',
            target: 'Blog',
            query: {
                where: {
                    userId: 5,
                }
            },
            data: {
                hearts: 1,
                views: 2
            }
        },
        {
            name: 'newBlog',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    userId: 5,
                }
            },
        },
    ]
}