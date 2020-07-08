module.exports.simple = {
    commands: [
        {
            name: 'goodBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                where: {
                    'views#gte': 500,
                    'hearts#gte': 50
                }
            },
            fields: 'id,title,content,views,hearts=>likes'
        }
    ]
}

module.exports.complex = {
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                where: {
                    'userId': 1,
                    'views#gte': 100,
                    $or: {
                        'title#like': 'blog%',
                        $and: {
                            'content#like': '%user%',
                            'createdAt#gte': '2019-05-01 14:30:00'
                        }
                    },
                    $not: {
                        $and: {
                            'hearts#lte': 10,
                            'views#lte': 50
                        }
                    }
                }
            },
            fields: 'id,title,content,views,hearts=>likes'
        }
    ]
}