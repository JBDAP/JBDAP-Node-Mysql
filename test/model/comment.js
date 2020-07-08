module.exports = {
    name: 'Comment',
    version: '1.0',
    comment: '博客评论',
    columns: [
        {
            name: 'id',
            type: 'increments',
            primary: true,
            notNullable: true,
        },
        {
            name: 'blogId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
        {
            name: 'fromUserId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
        {
            name: 'replyTo',
            type: 'integer',
            unsigned: true,
        },
        {
            name: 'content',
            notNullable: true,
            type: 'text',
        },
        {
            name: 'hearts',
            type: 'integer',
            notNullable: true,
            unsigned: true,
            defaultTo: 0,
        },
    ],
    uniques: [
    ],
    indexes: [
        ['blogId'],
        ['fromUserId'],
        ['hearts'],
    ],
    foreignKeys: [
        {
            selfColumn: 'blogId',
            targetTable: 'Blog',
            targetColumn: 'id'
        },
        {
            selfColumn: 'fromUserId',
            targetTable: 'User',
            targetColumn: 'id'
        },
        {
            selfColumn: 'replyTo',
            targetTable: 'Comment',
            targetColumn: 'id'
        },
    ]
}