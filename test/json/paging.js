
module.exports.list = {
    commands: [
        {
            name: 'allUsers',
            type: 'list',
            target: 'User',
            query: {
                size: 3,
                page: 4
            },
            fields: [
                'id',
                'username',
                'avatar',
                'updatedAt=>lastVisitedAt'
            ]
        }
    ]
}

module.exports.values = {
    commands: [
        {
            name: 'allUsers',
            type: 'values',
            target: 'User',
            query: {
                size: 3,
                page: 4
            },
            fields: [
                'count#id=>total',
            ]
        }
    ]
}