module.exports = {
    name: 'Subscription',
    version: '1.0',
    comment: '关注关系',
    columns: [
        {
            name: 'id',
            type: 'increments',
            primary: true,
            notNullable: true,
        },
        {
            name: 'authorId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
        {
            name: 'subscriberId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
    ],
    uniques: [
        ['authorId','subscriberId']
    ],
    indexes: [
        ['authorId'],
        ['subscriberId'],
    ],
    foreignKeys: [
        {
            selfColumn: 'authorId',
            targetTable: 'User',
            targetColumn: 'id'
        },
        {
            selfColumn: 'subscriberId',
            targetTable: 'User',
            targetColumn: 'id'
        },
    ]
}