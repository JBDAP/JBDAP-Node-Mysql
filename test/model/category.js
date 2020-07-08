module.exports = {
    name: 'Category',
    version: '1.0',
    comment: '文章类目表',
    columns: [
        {
            name: 'id',
            type: 'increments',
            primary: true,
            notNullable: true,
        },
        {
            name: 'name',
            type: 'string',
            notNullable: true,
            length: 20,
        },
        {
            name: 'sequence',
            type: 'integer',
            notNullable: true,
            unsigned: true,
            defaultTo: 0,
        },
    ],
    uniques: [
        ['name']
    ],
    indexes: [],
    foreignKeys: []
}