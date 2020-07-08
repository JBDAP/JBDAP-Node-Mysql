// 测试查询后排序
module.exports.single = {
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                order: 'views#desc',
                size: 1
            }
        },
        {
            name: 'mostPopular',
            type: 'values',
            target: 'Blog',
            fields: [
                'max#views=>maxView'
            ]
        },
    ]
}

module.exports.multiple = {
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                order: 'views#desc,hearts#desc',
                size: 10
            }
        },
    ]
}