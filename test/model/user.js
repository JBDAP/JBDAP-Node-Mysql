module.exports = {
    name: 'User',
    version: '1.0',
    comment: '用户表',
    columns: [
        {
            name: 'id',
            type: 'increments',
            primary: true,
            notNullable: true,
        },
        {
            name: 'username',
            type: 'string',
            notNullable: true,
            length: 100,
        },
        {
            name: 'password',
            type: 'string',
            notNullable: true,
            length: 100,
        },
        {
            name: 'avatar',
            type: 'string',
            length: 200,
        },
        {
            name: 'email',
            type: 'string',
            length: 100,
        },
        {
            name: 'gender',
            type: 'string',
            notNullable: true,
            length: 10,
            defaultTo: 'MALE',
        },
    ],
    uniques: [
        ['username']
    ],
    indexes: [],
    foreignKeys: []
}