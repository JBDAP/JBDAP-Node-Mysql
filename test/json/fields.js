module.exports.default = {
    commands: [
        {
            name: 'firstCategory',
            type: 'entity',
            target: 'Category',
        },
    ]
}

module.exports.string = {
    commands: [
        {
            name: 'firstCategory',
            type: 'entity',
            target: 'Category',
            fields: '*'
        },
        {
            name: 'secondCategory',
            type: 'entity',
            target: 'Category',
            query: {
                size: 1,
                page: 2,
            },
            fields: 'id,name,sequence'
        },
    ]
}

module.exports.array = {
    commands: [
        {
            name: 'allUsers',
            type: 'list',
            target: 'User',
            fields: [
                'id',
                'username',
                'avatar',
            ]
        }
    ]
}

module.exports.alias = {
    commands: [
        {
            name: 'allUsers',
            type: 'list',
            target: 'User',
            fields: [
                'id',
                'username',
                'avatar',
                'updatedAt=>lastVisitedAt'
            ]
        }
    ]
}