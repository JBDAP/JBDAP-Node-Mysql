// 测试删除操作
module.exports = {
    commands: [
        {
            name: 'blogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 4
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
                    'id#in': '/blogs.ids'
                }
            }
        },
        {
            name: 'leftBlogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 4
                }
            },
            fields: [
                'count#id=>total'
            ]
        }
    ]
}