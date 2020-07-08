/**
 * 数据库助手
 */

// 运行环境准备
const { JS, JE } = require('./global')

// 引入 ajv 模块
const Ajv = require('ajv')
const ajv = new Ajv({ allErrors: true })

/**
 * 创建单个数据表
 * @param {object} conn 数据库连接
 * @param {object} schema 单个数据表的定义文件
 * @param {string} lang 提示信息所用语言
 */
async function createTable(conn,schema,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 合法性检查
    checkTableSchema(schema,lang)
    // 检查表名是否存在
    let exists = await conn.schema.hasTable(schema.name)
    if (exists) JS.throwError('TableExistsError',null,null,[
        ['zh-cn', `数据表 '${schema.name}' 已经存在`],
        ['en-us', `Table '${schema.name}' already exists`]
    ],lang)
    // 创建字段、唯一键、索引
    return conn.schema.createTable(schema.name, (table) => {
        try {
            // 表格备注
            if (_.isString(schema.comment) && schema.comment !== '') table.comment(schema.comment)
            // 创建字段
            for (let i=0; i<schema.columns.length; i++) {
                let column = schema.columns[i]
                let length = (column.type === 'string' && _.isInteger(column.length)) ? ',' + column.length : ''
                let type = `.${column.type}('${column.name}'${length})`
                let primary = column.primary === true ? '.primary()' : ''
                let notNullable = column.notNullable === true ? '.notNullable()' : ''
                let defaultTo = !_.isUndefined(column.defaultTo) ? `.defaultTo(${JSON.stringify(column.defaultTo)})` : ''
                let unsigned = ((column.type === 'integer' || column.type === 'float' || column.type === 'decimal') && column.unsigned === true) ? '.unsigned()' : ''
                let comment = (_.isString(column.comment) && column.comment !== '') ? `.comment('${'Current Version ' + column.comment + ' : ' + column.comment}')` : ''
                let str = `table${type}${unsigned}${notNullable}${defaultTo}${primary}${comment}`
                // console.log(str)
                eval(str)
            }
            // 检查是否需要自动创建 createdAt 和 updatedAt
            if (_.findIndex(schema.columns, { name: 'createdAt' }) < 0) table.datetime('createdAt').comment('数据创建时间')
            if (_.findIndex(schema.columns, { name: 'updatedAt' }) < 0) table.datetime('updatedAt').comment('最后更新时间')
            // 创建唯一键
            if (schema.uniques) {
                for (let i=0; i<schema.uniques.length; i++) {
                    table.unique(schema.uniques[i])
                }
            }
            // 创建索引
            if (schema.indexes) {
                for (let i=0; i<schema.indexes.length; i++) {
                    table.index(schema.indexes[i])
                }
            }
            // 创建外键
            if (schema.foreignKeys) {
                for (let i=0; i<schema.foreignKeys.length; i++) {
                    let foreignKey = schema.foreignKeys[i]
                    table.foreign(foreignKey.selfColumn).references(foreignKey.targetColumn).inTable(foreignKey.targetTable)
                }
            }
        }
        catch (err) {
            JS.throwError('TableInitError',err,null,[
                ['zh-cn', `创建数据表 '${schema.name}' 结构出错`],
                ['en-us', `Error occurred while creating struct of table '${schema.name}'`]
            ],lang)
        }
    })
}
module.exports.createTable = createTable

/**
 * 检查 tableSchema 是否合法
 * @param {Object} json 完整的 tableSchema 描述
 * @param {String} lang 提示信息所用语言
 */
function checkTableSchema(json,lang) {
    // 默认语言
    if (_.isUndefined(lang)) lang = JE.i18nLang
    // 规则
    let schema = {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
            },
            version: {
                type: 'string',
            },
            comment: {
                type: 'string'
            },
            columns: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                        },
                        comment: {
                            type: 'string'
                        },
                        primary: { type: 'boolean' },
                        type: {
                            type: 'string',
                            enum: [ 'increments', 'string', 'integer', 'float', 'decimal', 'boolean', 'datetime', 'text' ]
                        },
                        length: {
                            type: 'integer',
                            minimum: 1
                        },
                        unsigned: { type: 'boolean' },
                        notNullable: { type: 'boolean' },
                        defaultTo: {}
                    },
                    required: [ 'name', 'type' ],
                    additionalProperties: false
                }
            },
            uniques: {
                type: 'array',
                uniqueItems: true,
                items: {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'string',
                        pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                    }
                }
            },
            indexes: {
                type: 'array',
                uniqueItems: true,
                items: {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'string',
                        pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                    }
                }
            },
            foreignKeys: {
                type: 'array',
                uniqueItems: true,
                items: {
                    type: 'object',
                    properties: {
                        selfColumn: {
                            type: 'string',
                            pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                        },
                        targetTable: {
                            type: 'string',
                            pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                        },
                        targetColumn: {
                            type: 'string',
                            pattern: '[a-zA-Z]+[a-zA-z0-9_]*'
                        }
                    },
                    required: [ 'selfColumn', 'targetTable', 'targetColumn' ],
                    additionalProperties: false
                }
            }
        },
        required: [ 'name', 'version', 'columns' ],
        additionalProperties: false
    }
    // 执行校验
    let valid = ajv.validate(schema, json)
    // 处理错误信息
    if (!valid) {
        // 按照数据路径分组
        let groups = {}
        _.each(ajv.errors,(item)=>{
            let key = 'json' + item.dataPath
            if (!groups[key]) groups[key] = []
            let msg = item.message
            // 补充报错信息
            if (item.keyword === 'additionalProperties') msg += ` '${item.params.additionalProperty}'`
            if (item.keyword === 'enum') msg += ` in ${JSON.stringify(item.params.allowedValues).replaceAll('","','|').replaceAll('"','')}`
            groups[key].push(msg)
        })
        let keys = _.sortBy(Object.keys(groups))
        let errorMessage = ''
        _.each(keys,(key)=>{
            errorMessage += `${key} : ${groups[key].join(', ')}; `
        })
        // 抛出错误
        JS.throwError('SchemaError',null,{
            ajvErrors: ajv.errors
        },[
            ['zh-cn',`接收到的 schema 参数有问题 <= ${errorMessage}`],
            ['en-us',`The schema parameter is not valid <= ${errorMessage}`]
        ],lang)
    }
    else return true
}

/**
 * 删除单个数据表
 * @param {object} conn 数据库连接
 * @param {string} tableName 数据表名
 * @param {string} lang 提示信息所用语言
 */
async function dropTable(conn,tableName,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    await conn.schema.dropTableIfExists(tableName)
}
module.exports.dropTable = dropTable
