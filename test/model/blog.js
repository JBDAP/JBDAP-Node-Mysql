module.exports = {
    name: 'Blog',
    version: '1.0',
    comment: '博客文章',
    columns: [
        {
            name: 'id',
            type: 'increments',
            primary: true,
            notNullable: true,
        },
        {
            name: 'userId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
        {
            name: 'categoryId',
            type: 'integer',
            notNullable: true,
            unsigned: true,
        },
        {
            name: 'title',
            type: 'string',
            notNullable: true,
            length: 100,
        },
        {
            name: 'keywords',
            type: 'string',
            length: 200,
        },
        {
            name: 'content',
            notNullable: true,
            type: 'text',
        },
        {
            name: 'views',
            type: 'integer',
            notNullable: true,
            unsigned: true,
            defaultTo: 0,
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
        ['title']
    ],
    indexes: [
        ['keywords'],
        ['views'],
        ['hearts'],
    ],
    foreignKeys: [
        {
            selfColumn: 'userId',
            targetTable: 'User',
            targetColumn: 'id'
        },
        {
            selfColumn: 'categoryId',
            targetTable: 'Category',
            targetColumn: 'id'
        },
    ]
}