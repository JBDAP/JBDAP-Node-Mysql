
module.exports.calculate = {
    commands: [
        {
            name: 'blogStat',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                },
                order: 'id#desc'
            },
            fields: [
                'count#id=>totalBlogs',
                'sum#hearts=>totalHearts',
                'max#views=>maxViews',
                'min#views=>minViews',
                'avg#hearts=>avgHearts'
            ]
        }
    ]
}

module.exports.function = {
    needLogs: true,
    commands: [
        {
            name: 'blogStat',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                },
                order: 'id#desc'
            },
            fields: [
                'first#title=>latestTitle',
                'pick#id=>blogIds',
                'clone#id,title,content,hearts=>list'
            ]
        }
    ]
}