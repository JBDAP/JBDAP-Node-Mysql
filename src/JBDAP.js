/**
 * JBDAP-Node-Mysql 入口
 */

// 运行环境准备
const { JS, JE } = require('./global')

// 定义支持的语言列表
JE.LANGUAGES = [
    'zh-cn',
    'en-us'
]

// 将环境自带的 knex 暴露出来供开发者需要时调用
module.exports.knex = JS.knex
// 快捷获取 Mysql 数据库连接
const getConn = (config) => {
    let cfg = {
        port: '3306',
        minPool: 1,
        maxPool: 10
    }
    let keys = Object.keys(config)
    _.each(keys, (key) => {
        cfg[key] = config[key]
    })
    return JS.knex({
        client: 'mysql2',
        connection: {
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.pass,
          database: cfg.dbName
        },
        pool: {
            min: cfg.minPool,
            max: cfg.maxPool
        },
        useNullAsDefault: true,
        asyncStackTraces: true,
        debug: false
    })
}
module.exports.getConn = getConn

// 引入解析模块（设置默认语言）
let { parser, validator, reference, calculator } = require('jbdap-interpreter')('zh-cn')

// 包的版本
const { version } = require('../package.json')
module.exports.version = version

// 导出 helper 模块
const helper = require('./helper')
module.exports.helper = helper

/**
 * JBDAP 的入口函数，解析并执行 json 中的指令
 * @param {Object} conn Mysql 数据库连接对象
 * @param {Object} json 要执行的 JBDAP 命令
 * @param {Object} configs 配置参数
 */
async function manipulate(conn,json,configs) {
    configs = configs || {}
    // 全局默认值
    if (_.isString(configs.serverName) && configs.serverName !== '') JE.dbServer = configs.serverName
    if (_.isString(configs.primaryKey) && configs.primaryKey !== '') JE.primaryKey = configs.primaryKey
    if (_.isString(configs.language) && configs.language !== '') JE.i18nLang = configs.language
    // 调用端是否有提示语言设定
    let lang = JE.i18nLang
    if (!_.isUndefined(json.language)) {
        // 有效的语言
        if (JE.LANGUAGES.indexOf(json.language) >= 0) {
            lang = json.language
        }
    }
    let interpreter = require('jbdap-interpreter')(lang)
    parser = interpreter.parser
    validator = interpreter.validator
    reference = interpreter.reference
    calculator = interpreter.calculator
    // 执行完成后返回的结果
    let returnObj = {
        code: 200,
        message: 'ok',
        data: {}
    }
    // 执行过程日志
    let logs = []
    try {
        // 开始
        addLog(logs, [
            ['zh-cn', '- 开启 JBDAP 任务'],
            ['en-us', '- JBDAP task begins']
        ],lang)

        // 1、验证参数是否合法
        addLog(logs, [
            ['zh-cn', '- 检查接收到的 JSON 是否合法'],
            ['en-us', '- Check JSON validity']
        ],lang)
        validator.checkJSON(json,lang)  // 如果出错会直接抛出，跳转到 catch 里继续添加日志

        // 2、取得当前用户账号信息及权限定义
        addLog(logs, [
            ['zh-cn', '* 识别用户身份'],
            ['en-us', '* Get user identity']
        ],lang)
        let user = {}
        // 注意 configs.recognizer 是用户自己定义的鉴权函数，用来识别当前用户，并返回用户信息保存在 user
        // 这个 user 会在后边 JBDAP 的执行过程中始终作为权限控制的依据
        if (_.isFunction(configs.recognizer)) user = await configs.recognizer(json.security || {},lang)

        // 3、定义要用到的变量
        // root 用于保存数据的临时空间
        let root = {
            $after$: {}
        }
        // 对指令进行预处理
        let commands = json.commands
        // 单个指令转数组
        if (_.isPlainObject(json.commands)) commands = [commands]

        // 4、开始执行
        addLog(logs, [
            ['zh-cn', '- 开始处理接收到的指令'],
            ['en-us', '- Proceed to handle commands']
        ],lang)
        // 我们将在整个过程中不会改变的环境参数打包在一起进行传递
        let workshop = {
            // 数据库连接
            conn: conn,
            // 是否以事务运行
            isTransaction: json.isTransaction,
            // 事务对象
            trx: null,
            // 权限控制器
            doorman: configs.doorman,
            // 数据过滤器
            scanner: configs.scanner,
            // 缓存处理器
            cacher: configs.cacher,
            // 服务端函数调度器
            dispatcher: configs.dispatcher,
            // 是否打印 sql 语句
            printSql: _.isBoolean(configs.printSql) ? configs.printSql : true,
            // 原始命令集
            commands: commands,
            // 已获得的用户身份
            user: user,
            // 日志列表
            logs: logs,
            // 保存数据的根对象
            root: root,
            // 提示信息语言
            lang: lang
        }
        // 进入处理流程，出错会直接抛出，跳转到 catch 继续输出日志
        await proceed(workshop)
        // 无错误抛出则说明执行成功
        addLog(logs, [
            ['zh-cn', '- 全部指令处理完成'],
            ['en-us', '- All commands handled successfully']
        ],lang)
        addLog(logs, [
            ['zh-cn', '- JBDAP 任务成功'],
            ['en-us', '- JBDAP task succeeded']
        ],lang)

        // 5、获取结果数据返回
        for (let i=0; i<commands.length; i++) {
            let item = commands[i]
            // 检查错误
            if (root[item.name].error) {
                returnObj.code = 500
                returnObj.message = root[item.name].error
            }
            // 是否需要返回
            if (item.return !== false) {
                returnObj.data[item.name] = root[item.name].data
            }
        }
        // 添加 after 结果
        if (JSON.stringify(root.$after$) !== '{}') returnObj.data.$after$ = root.$after$
        // console.log('原始数据：',JSON.stringify(root,null,4))
        // 整理返回格式
        if (json.needLogs === true) returnObj.logs = logs
        return returnObj
    }
    catch (err) {
        // 捕捉到错误意味着任务失败
        addLog(logs, [
            ['zh-cn', '- JBDAP 任务失败'],
            ['en-us', '- JBDAP task failed']
        ],lang)
        // 根据错误提示来给出错误码
        returnObj.code = 500
        // 正常捕获到的 NiceError 错误
        if (err.fullMessage) {
            let msg = err.fullMessage()
            // 参数校验没通过
            if (
                msg.indexOf('[JSONError]') >= 0 
                ||
                msg.indexOf('[CommandError]') >= 0 
                ||
                msg.indexOf('[SqlInjectionError]') >= 0
            ) {
                returnObj.code = 400
            }
            // 没有操作权限
            if (msg.indexOf('[AuthError]') >= 0) returnObj.code = 403
            // 完整的错误链条提示信息
            returnObj.message = err.fullMessage()
            returnObj.data = null
            // 返回日志
            if (json.needLogs === true) returnObj.logs = logs
            // 返回错误堆栈信息跟踪
            if (json.needTrace === true) returnObj.trace = err.fullStack()
        }
        // 预期之外的服务端错误
        else {
            returnObj.message = err.toString()
            returnObj.data = null
            // 返回日志
            if (json.needLogs === true) returnObj.logs = logs
            // 返回错误堆栈信息跟踪
            if (json.needTrace === true) returnObj.trace = err
        }
        return returnObj
    }
}
module.exports.manipulate = manipulate

/**
 * 写入日志
 * @param {array} logs 日志存储列表
 * @param {array} dict 不同语言日志内容
 * @param {string} lang 提示信息所用语言
 */
function addLog(logs,dict,lang) {
    if (_.isUndefined(lang)) lang = JE.i18nLang
    for (let i=0; i<dict.length; i++) {
        let item = dict[i]
        if (item[0] === lang) {
            logs.push(item[1])
            break
        }
    }
}

/**
 * 根据缩进增加空格
 * @param {integer} n 缩进层次
 */
function prefix(n) {
    let result = ''
    for (let i=1; i<n; i++) result += '  '
    return result
}

/**
 * 开始执行指令
 * @param {Object} workshop 处理过程的完整静态环境
 */
async function proceed(workshop) {
    let lang = workshop.lang
    let commands = workshop.commands
    let logs = workshop.logs
    // 检查是否以事务执行
    if (workshop.isTransaction === true) {
        addLog(logs, [
            ['zh-cn', '- 以事务方式执行'],
            ['en-us', '- Commands will be handled as a transaction']
        ],lang)
        await workshop.conn.transaction(async function(trx) {
            // 这里开始事务
            try {
                // 递归执行 commands 中的指令
                for (let i=0; i<commands.length; i++) {
                    let cmd = _.cloneDeep(commands[i])
                    // 检查顶层指令是否合法
                    validator.checkTopCommand(cmd,lang)
                    // 执行顶层指令
                    addLog(logs, [
                        ['zh-cn', `${prefix(1)}$ 开始执行顶层命令 /${cmd.name} [${cmd.type} 类型]`],
                        ['en-us', `${prefix(1)}$ Begin to handle top command /${cmd.name} ['${cmd.type}' type]`]
                    ],lang)
                    // 设置参数
                    workshop.trx = trx
                    // 跟单个任务相关的参数（有可能会改变）
                    let isTop = true   // 是否顶层指令
                    let level = 1      // 当前指令层级
                    let parent = null  // 父对象
                    await handleCmd(workshop,cmd,isTop,level,parent)
                    addLog(logs, [
                        ['zh-cn', `${prefix(1)}$ 顶层命令 /${cmd.name} 执行完毕`],
                        ['en-us', `${prefix(1)}$ Top command /${cmd.name} finished`]
                    ],lang)
                }
                addLog(logs, [
                    ['zh-cn', '- 事务执行成功'],
                    ['en-us', '- Transaction succeeded']
                ],lang)
                return true
            }
            catch (err) {
                addLog(logs, [
                    ['zh-cn', '- 事务失败，数据回滚'],
                    ['en-us', '- Transaction failed, data has been rolled back']
                ],lang)
                JS.throwError('TransactionError',err,null,[
                    ['zh-cn','解析或执行事务失败'],
                    ['en-us','Proceed transaction failed']
                ],lang)
            }
        })
    }
    else {
        try {
            addLog(logs, [
                ['zh-cn', '- 非事务方式执行'],
                ['en-us', '- Commands will be handled in non-transaction mode']
            ],lang)
            // 递归执行 commands 中的指令
            for (let i=0; i<commands.length; i++) {
                let cmd = _.cloneDeep(commands[i])
                // 检查顶层指令是否合法
                validator.checkTopCommand(cmd,lang)
                // 执行顶层指令
                addLog(logs, [
                    ['zh-cn', `${prefix(1)}$ 开始执行顶层命令 /${cmd.name} [${cmd.type} 类型]`],
                    ['en-us', `${prefix(1)}$ Begin to handle top command /${cmd.name} ['${cmd.type}' type]`]
                ],lang)
                // 设置参数
                workshop.trx = null
                // 跟单个任务相关的参数（有可能会改变）
                let isTop = true   // 是否顶层指令
                let level = 1      // 当前指令层级
                let parent = null  // 父对象
                await handleCmd(workshop,cmd,isTop,level,parent)
                addLog(logs, [
                    ['zh-cn', `${prefix(1)}$ 顶层命令 /${cmd.name} 执行完毕`],
                    ['en-us', `${prefix(1)}$ Top command /${cmd.name} finished`]
                ],lang)
            }
        }
        catch (err) {
            JS.throwError('CommandsExecError',err,null,[
                ['zh-cn','解析或执行指令失败'],
                ['en-us','Proceed commands failed']
            ],lang)
        }
    }
}

/**
 * 处理单个指令
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Boolean} isTop 是否顶层指令
 * @param {Number} level 当前执行的层级（主要用于控制日志输出前面的空格）
 * @param {Object} parent 父对象
 */
async function handleCmd(workshop,cmd,isTop,level,parent) {
    let lang = workshop.lang
    let logs = workshop.logs
    let root = workshop.root
    try {
        // 保存执行结果
        let result = null

        // 执行指令

        // 1、检查缓存空间是否已经存在
        if (isTop === true) {
            if (Object.keys(root).indexOf(cmd.name) >= 0) {
                addLog(logs, [
                    ['zh-cn', `${prefix(level)}$ /${cmd.name} 已经存在`],
                    ['en-us', `${prefix(level)}$ /${cmd.name} already exists`]
                ],lang)
                // 存在则直接返回结果
                return root[cmd.name].data
            }
            // 顶层命令需要创建缓存空间
            root[cmd.name] = {
                return: cmd.return || true,
                error: null,
                data: null
            }
        }

        // 2、检查 onlyIf 前置条件
        // 注意它无需 isTop 参数
        let cr = await checkOnlyIf(workshop,cmd,level,parent)
        // console.log(cr)
        if (cr === false) {
            addLog(logs, [
                ['zh-cn', `${prefix(level)}* 前置条件不成立！跳过 '${cmd.name}' 指令`],
                ['en-us', `${prefix(level)}* Precondition does not match, skip '${cmd.name}' command`]
            ],lang)
            // 不满足条件则返回 null 值
            return null
        }

        // 3、检查指令权限
        // 非引用指令才有必要检查
        if (cmd.target.indexOf('/') < 0) {
            // 以 JBDAP_ 开头的系统内置表均不可被前端访问
            if (cmd.target.indexOf('JBDAP_') === 0) JS.throwError('AuthError',null,null,[
                ['zh-cn', `没有权限执行当前指令 '${cmd.name}'`],
                ['en-us', `No authority to handle current command '${cmd.name}'`]
            ],lang)
            // 调用自定义权限控制函数进行检查
            if (_.isFunction(workshop.doorman)) {
                // data 是将要被验证权限的数据
                let data = null
                // 删和改操作需要对目标数据进行预校验
                let operations = [
                    'update',
                    'delete',
                    'increase',
                    'decrease'
                ]
                if (operations.indexOf(cmd.type) >= 0) {
                    // 将当前 cmd 改为 list 查询获取出所有符合条件的数据
                    // 这里用另一个副本来修改并查询
                    let qCmd = _.cloneDeep(cmd)
                    qCmd.type = 'list'
                    qCmd.fields = ['*']
                    delete qCmd.data
                    data = await queryCmd(workshop,qCmd,isTop,level,parent)
                    // console.log(data)
                }
                if (cmd.type === 'create') {
                    if (_.isPlainObject(cmd.data)) {
                        cmd.data = [cmd.data]
                        data = cmd.data
                    }
                }
                // 传给检验函数
                let authorized = true
                try {
                    let queryTypes = [
                        'list',
                        'entity',
                        'values'
                    ]
                    // 操作类提前验证权限，查询类获得结果后再验证(在 queryCmd 函数中)
                    // 服务端函数无需验证(函数内自己验证)
                    if (queryTypes.indexOf(cmd.type) < 0 && cmd.type !== 'function') {
                        // 传递给 doorman 验证函数的参数如下：
                        // user - 前面 recognizer 函数获得的用户信息
                        // cmd - 要被验证的指令
                        // data - 指令执行影响到的数据集
                        // lang - 日志和错误信息用到的默认语言
                        // 函数 doorman 的实现中可以用抛出 NiceError 的方式将错误信息加入 jbdap 的错误链
                        authorized = await workshop.doorman(workshop.user,cmd,data,lang)
                    }
                }
                catch (err) {
                    JS.throwError('AuthError',err,null,[
                        ['zh-cn', `不被许可执行当前指令 '${cmd.name}'`],
                        ['en-us', `No permission to handle current command '${cmd.name}'`]
                    ],lang)
                }
                if (authorized === false) JS.throwError('AuthError',null,null,[
                    ['zh-cn', `不被许可执行当前指令 '${cmd.name}'`],
                    ['en-us', `No permission to handle current command '${cmd.name}'`]
                ],lang)
            }
        }

        // 4、对指令进行分类执行
        switch (cmd.type) {
            case 'entity':
            case 'list':
            case 'values':
                // 查询类指令
                result = await queryCmd(workshop,cmd,isTop,level,parent)
                break
            case 'create':
            case 'update':
            case 'delete':
            case 'increase':
            case 'decrease':
                // 操作类指令
                result = await executeCmd(workshop,cmd,isTop,level,parent)
                break
            case 'function':
                // 服务端函数
                result = await executeFunction(workshop,cmd,isTop,level,parent)
                break
        }

        // 5、执行 after 定义的后续指令
        if (!_.isUndefined(cmd.after)) {
            addLog(logs, [
                ['zh-cn', `${prefix(level+1)}# 开始执行后置指令`],
                ['en-us', `${prefix(level+1)}# Subsequent commands begin`]
            ],lang)
            let afterCmds = cmd.after
            if (!_.isArray(cmd.after)) afterCmds = [cmd.after]
            for (let i=0; i<afterCmds.length; i++) {
                let afterCmd = _.cloneDeep(afterCmds[i])
                // 检查指令是否合法
                validator.checkCommand(afterCmd,lang)
                addLog(logs, [
                    ['zh-cn', `${prefix(level+2)}$ 开始执行 after 指令${i+1} /${afterCmd.name} [${afterCmd.type} 类型]`],
                    ['en-us', `${prefix(level+2)}$ Begin to handle after command${i+1} /${afterCmd.name} ['${afterCmd.type}' type]`]
                ],lang)
                // 只执行不返回
                let temp = await handleCmd(workshop,afterCmd,isTop,level+2,result)
                // 将 after 的执行结果附加到 result
                if (_.isUndefined(root.$after$[cmd.name])) root.$after$[cmd.name] = {}
                root.$after$[cmd.name][afterCmd.name] = temp
                // console.log(temp)
                addLog(logs, [
                    ['zh-cn', `${prefix(level+2)}$ 指令${i+1} /${afterCmd.name} 执行完毕]`],
                    ['en-us', `${prefix(level+2)}$ Command${i+1} /${afterCmd.name} finished`]
                ],lang)                
            }
            addLog(logs, [
                ['zh-cn', `${prefix(level+1)}# 后置指令执行完毕`],
                ['en-us', `${prefix(level+1)}# Subsequent commands finished`]
            ],lang)
        }
        return result
    }
    catch (err) {
        if (isTop === true) addLog(logs, [
            ['zh-cn', `${prefix(level)}$ 执行顶层命令 /${cmd.name} 出错`],
            ['en-us', `${prefix(level)}$ Error occurred in top command /${cmd.name}`]
        ],lang)
        else addLog(logs, [
            ['zh-cn', `${prefix(level)}@ 执行级联指令 /${cmd.name} 出现错误`],
            ['en-us', `${prefix(level)}$ Error occurred in cascaded command /${cmd.name}`]
        ],lang)
        JS.throwError('CommandHandlerError',err,null,[
            ['zh-cn', `处理指令 '${cmd.name}' 出错`],
            ['en-us', `Error occurred while handling command '${cmd.name}'`]
        ],lang)
    }
}

/**
 * 前置条件是否成立
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Number} level 当前执行的层级（主要用于控制日志输出前面的空格）
 * @param {Object} parent 父对象
 */
async function checkOnlyIf(workshop,cmd,level,parent) {
    let root = workshop.root
    let lang = workshop.lang
    let logs = workshop.logs
    try {
        // console.log('checkOnlyIf',cmd.name)
        if (_.isUndefined(cmd.onlyIf)) return true
        return calculator.checkCondition('compare',cmd.onlyIf,'and',root,parent,null,lang)
    }
    catch (err) {
        // 错误日志
        addLog(logs, [
            ['zh-cn', `${prefix(level)}$ 顶层命令 /${cmd.name} 执行条件出错`],
            ['en-us', `${prefix(level)}$ Error occurred while executing the 'onlyIf' condition of top command /${cmd.name}`]
        ],lang)
        // 抛出错误
        JS.throwError('OnlyIfError',err,null,[
            ['zh-cn', `'onlyIf' 条件解析出错`],
            ['en-us', `Error occurred while parsing 'onlyIf' conditions`]
        ],lang)
    }
}

/**
 * 执行单个查询指令
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Boolean} isTop 是否顶层指令
 * @param {Number} level 当前执行的层级（主要用于控制日志输出前面的空格）
 * @param {Object} parent 父对象
 */
async function queryCmd(workshop,cmd,isTop,level,parent) {
    let root = workshop.root
    let lang = workshop.lang
    let logs = workshop.logs
    let commands = workshop.commands
    // 查询类指令
    let result = null
    try {
        // console.log('queryCmd',cmd.name)
        // 取得要获取的字段
        let fields = parser.parseFields(cmd.fields,lang)
        let rawFields = fields.raw
        let cascadedFields = fields.cascaded
        let valuesFields = fields.values
        let toolingTypes = [
            'first',
            'clone',
            'pick',
        ]
        // values 计算存在不能使用 sql 函数得到结果的查询时，就必须查出所有数据
        let needList = _.findIndex(valuesFields, (item) => { return toolingTypes.indexOf(item.operator) >= 0 }) >= 0 || (!_.isUndefined(cmd.query) && !_.isUndefined(cmd.query.size))
        // 判断查询类型 [引用|读表]
        if (cmd.target.indexOf('/') === 0) {
            // 引用查询开始 ==>
            let objName = cmd.target.split('/')[1].split('.')[0]
            // 检查引用对象是否被定义
            let idx = _.findIndex(commands,{ name: objName })
            if (idx < 0) JS.throwError('RefDefError',null,null,[
                ['zh-cn', `被引用对象 '/${objName}' 不存在于 commands 指令集中`],
                ['en-us', `The referred target '/${objName}' doesn't exist in commands`]
            ],lang)
            // 检查被引用数据是否填充
            if (Object.keys(root).indexOf(objName) < 0) {
                // 抛出错误
                JS.throwError('RefNotFilled',null,{
                    needRef: objName
                },[
                    ['zh-cn',`引用对象 /${objName} 尚未填充数据`],
                    ['en-us',`Reference /${objName} has no data filled`]
                ],lang)
            }
            // 被引用数据
            let rawData = root[objName].data
            if (_.isNull(rawData)) JS.throwError('RefDefError',null,null,[
                ['zh-cn', `被引用对象 '/${objName}' 不能为 null`],
                ['en-us', `The referred target '/${objName}' can not be a null`]
            ],lang)
            // 获取级联属性
            if (_.isPlainObject(rawData)) {
                let slices = cmd.target.split('/')[1].split('.')
                if (slices.length > 1) {
                    for (let i=1; i<slices.length; i++) {
                        if (Object.keys(rawData).indexOf(slices[i]) < 0) JS.throwError('RefDefError',null,null,[
                            ['zh-cn', `引用对象有误，不存在 '${cmd.target}' 路径`],
                            ['en-us', `The referred path '${cmd.target}' does not exist`]
                        ],lang)
                        rawData = rawData[slices[i]]
                    }
                }
            }
            // 根据 cmd.type 和被引用数据类型来判断调用那个函数
            if (_.isArray(rawData)) {
                // 从数组中取出单个 entity
                if (cmd.type === 'entity') result = reference.getObjFromList(rawData,cmd.query,rawFields,root,parent,lang)
                // 从数组中取出 list
                if (cmd.type === 'list') result = reference.getListFromList(rawData,cmd.query,rawFields,root,parent,lang)
                // 对数组进行计算得到 values
                if (cmd.type === 'values') result = reference.getValuesFromList(rawData,valuesFields,lang)
            }
            else if (_.isPlainObject(rawData)) {
                // 从 object 中取子集 object
                result = reference.getObjFromObj(rawData,rawFields,lang)
            }
            else JS.throwError('RefValueError',null,null,[
                ['zh-cn', `被引用对象 '${cmd.target}' 必须是 Array 或者 Object 类型`],
                ['en-us', `The referred target '${cmd.target}' must be an Array or an Object`]
            ],lang)
        }
        else {
            // 数据表查询开始 ==>
            // 0、检查是否有缓存
            let hasCacher = false
            let hasCache = false
            if (_.isFunction(workshop.cacher)) {
                hasCacher = true
                // 取值
                let cache = await workshop.cacher('get',cmd)
                // 缓存命中
                if (cache !== null) {
                    result = cache
                    hasCache = true
                }
            }
            // 如果没有缓存则查表
            if (!hasCache) {
                // 1、定位到数据表
                let conn = workshop.conn
                let trx = workshop.trx
                let query = conn.from(cmd.target)
                if (trx !== null) query = trx(cmd.target)
                // 2、设定要查询的原始字段
                // 能够使用 sql 函数的计算类型
                if (cmd.type !== 'values' || (cmd.type === 'values' && needList)) {
                    if (rawFields === '*') query = query.select()
                    else query = query.column(rawFields).select()
                }
                // 3、是否有定义查询规则
                if (_.isPlainObject(cmd.query)) {
                    // 3.1 解析 where 条件
                    let func = getWhereFunc(workshop,cmd,parent)
                    // console.log(func)
                    if (func !== null) query = eval('query.where(' + func + ')')
                    // 3.2、解析 order
                    let order = parser.parseOrder(cmd.query.order,lang)
                    if (order.length > 0) query = query.orderBy(order)
                    // 3.3、解析 size 和 page
                    if (!_.isUndefined(cmd.query.size)) {
                        let pas = parser.parseOffsetAndLimit(cmd.query.page,cmd.query.size,lang)
                        // 取有限记录
                        if (pas.limit > 0) query = query.limit(pas.limit)
                        // 有翻页
                        if (pas.offset > 0) query = query.offset(pas.offset)
                    }
                    else {
                        // 如果是 entity 查询则只取第一条数据即可
                        if (cmd.type === 'entity') query = query.limit(1)
                    }
                }
                // 4、执行查询
                // 只用 sql 函数就可以实现的 values 查询
                if (cmd.type === 'values' && needList === false) {
                    if (valuesFields.length === 0) JS.throwError('FieldsDefError',null,null,[
                        ['zh-cn', `'values' 查询类型至少要定义一个取值字段`],
                        ['en-us', `Queries of type 'values' require at least one value field`]
                    ],lang)
                    for (let i=0; i<valuesFields.length; i++) {
                        // 传入查询结果进行处理
                        let item = valuesFields[i]
                        let slices = item.fields.split(',')
                        if (slices.length > 1) JS.throwError('FieldsDefError',null,null,[
                            ['zh-cn', `'${item.operator}' 运算只接受一个字段`],
                            ['en-us', `Calculations of type '${item.operator}' accept only one field`]
                        ],lang)
                        query = eval(`query.${item.operator}({ ${item.name}: '${slices[0]}' })`)
                    }
                    if (workshop.printSql === true) console.log('sql:',query.toString())
                    let list = await query
                    result = list[0]
                }
                else {
                    if (workshop.printSql === true) console.log('sql:',query.toString())
                    result = await query
                }
                // 对查询结果（TextRow 类型）进行处理（转成 PlainObject）
                result = JSON.parse(JSON.stringify(result))
                // 存入缓存
                if (hasCacher) await workshop.cacher('set',cmd,result)
            }
            // console.log('result',result)
            // 5、传给检验函数进行权限验证
            let authorized = true
            try {
                let doorman = workshop.doorman
                if (_.isFunction(doorman)) {
                    // 操作类提前验证权限，查询类获得结果后再验证
                    authorized = await doorman(workshop.user,cmd,result,cmd.data,lang)
                }
            }
            catch (err) {
                JS.throwError('AuthError',err,null,[
                    ['zh-cn', `不被许可执行当前指令 '${cmd.name}'`],
                    ['en-us', `No permission to handle current command '${cmd.name}'`]
                ],lang)
            }
            if (authorized === false) JS.throwError('AuthError',null,null,[
                ['zh-cn', `不被许可执行当前指令 '${cmd.name}'`],
                ['en-us', `No permission to handle current command '${cmd.name}'`]
            ],lang)
            // 6、敏感字段过滤
            // 在 values 计算前就进行过滤
            // 非引用类型才需要过滤
            if (cmd.target.indexOf('/') < 0) {
                let scanner = workshop.scanner
                if (_.isFunction(scanner)) result = await scanner(workshop.user,cmd,fields.raw,result,lang)
            }
            // 7、如果是 values 取值查询，则执行相应的数据处理
            if (cmd.type === 'values' && needList === true) {
                if (valuesFields.length === 0) JS.throwError('FieldsDefError',null,null,[
                    ['zh-cn', `'values' 查询类型至少要定义一个取值字段`],
                    ['en-us', `Queries of type 'values' require at least one value field`]
                ],lang)
                let values = {}
                for (let i=0; i<valuesFields.length; i++) {
                    // 传入查询结果进行处理
                    let item = valuesFields[i]
                    if (Object.keys(values).indexOf(item.name) >= 0) JS.throwError('FieldsDefError',null,null,[
                        ['zh-cn', `'fields' 中定义的别名有重复`],
                        ['en-us', `'fields' property contains conflict alias definition`]
                    ],lang)
                    values[item.name] = calculator.getValue(result,item,lang)
                }
                result = values
            }
            // console.log('values',values)
        }
        // 8、填充级联字段
        if (cmd.type !== 'values') {
            if (result.length > 0 && cascadedFields.length > 0) {
                for (let j=0; j<cascadedFields.length; j++) {
                    let command = cascadedFields[j]
                    let key = command.name
                    // 检查指令是否合法
                    validator.checkCommand(command,lang)
                    addLog(logs, [
                        ['zh-cn', `${prefix(level+1)}$ 开始填充级联字段 [${key}]`],
                        ['en-us', `${prefix(level+1)}$ Begin to fill cascaded field [${fields}]`]
                    ],lang)
                    for (let i=0; i<result.length; i++) {
                        let item = result[i]
                        // 下级查询
                        item[key] = await queryCmd(workshop,command,false,level+1,item)
                    }
                    addLog(logs, [
                        ['zh-cn', `${prefix(level+1)}$ 级联字段 [${key}] 填充完毕`],
                        ['en-us', `${prefix(level+1)}$ Filling cascaded field [${key}] finished`]
                    ],lang)
                }
            }
        }
        // 整理返回值
        if (cmd.type === 'entity') {
            if (_.isArray(result) && result.length === 0) result = null
            else if (_.isArray(result)) result = result[0]
            if (isTop) root[cmd.name].data = result
        }
        if (cmd.type === 'list') {
            if (_.isArray(result) && result.length === 0) result = null
            if (isTop) root[cmd.name].data = result
        }
        if (cmd.type === 'values') {
            if (isTop) root[cmd.name].data = result
        }
        // 返回
        return result
    }
    catch (err) {
        JS.throwError('DBQueryError',err,null,[
            ['zh-cn', `查询数据出错`],
            ['en-us', `Error occurred while querying data`]
        ],lang)
    }
}

/**
 * 拼组 where 查询条件
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Object} parent 父对象
 */
function getWhereFunc(workshop,cmd,parent) {
    let lang = workshop.lang
    if (_.isPlainObject(cmd.query) && _.isUndefined(cmd.query.where)) return null
    try {
        let where = {}
        if (_.isPlainObject(cmd.query.where)) where = cmd.query.where
        let func = getSubConditionFunc(where,'and',workshop,parent)
        // console.log(func.toString())
        return func
    }
    catch (err) {
        JS.throwError('WhereParserError',err,null,[
            ['zh-cn', `'where' 条件解析出错`],
            ['en-us', `Error occurred while parsing 'where' conditions`]
        ],lang)
    }
}

/**
 * 拼组 where 分组查询条件
 * @param {object} obj 分组条件
 * @param {object} type 分组类别
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} parent 父对象
 */
function getSubConditionFunc(obj,type,workshop,parent) {
    let root = workshop.root
    let lang = workshop.lang
    try {
        let keys = Object.keys(obj)
        let funcDefine = 'function(){ '
        // 注意，这里是为了构造一个函数
        // 此函数下所有的 this 在运行时都指向正在执行的 knex 实例
        // 
        for (let i=0;i<keys.length; i++) {
            let key = keys[i]
            let value = obj[key]
            // key 的处理
            // 如果是子查询表达式
            if (key.indexOf('$') === 0) {
                // 构造子查询条件
                let subType = key.split('$')[1]
                let subContent = getSubConditionFunc(value,subType,workshop,parent)
                let func = ''
                if (i===0) {
                    if (type==='and' || type==='or') func = `this.where({content})`
                    if (type==='not') func = `this.whereNot({content})`
                }
                else {
                    if (type==='and') func = `.andWhere({content})`
                    if (type==='or') func = `.orWhere({content})`
                    if (type==='not') func = `.whereNot({content})`
                }
                let itemStr = func.replace('{content}',subContent)
                funcDefine += itemStr
            }
            // 单项表达式
            else {
                // 先解析
                let comparision = parser.parseComparision('query',key,value,lang)
                if (_.isString(comparision.right)) {
                    comparision.right = calculator.tag2value(comparision.right,root,parent,null,lang)
                    if (validator.hasSqlInjection(comparision.right)) JS.throwError('SqlInjectionError',null,null,[
                        ['zh-cn', `'where' 条件发现 sql 注入字符`],
                        ['en-us', `Sql Injection characters found in 'where' conditions`]
                    ],lang)
                }
                // 后拼组查询条件
                let left = comparision.left, right = comparision.right, operator = comparision.operator
                switch (operator) {
                    case 'eq': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where({'{left}':{right}})`
                            if (type==='not') func = `this.whereNot({'{left}':{right}})`
                        }
                        else {
                            if (type==='and') func = `.andWhere({'{left}':{right}})`
                            if (type==='or') func = `.orWhere({'{left}':{right}})`
                            if (type==='not') func = `.whereNot({'{left}':{right}})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'ne':{
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNot({'{left}':{right}})`
                            if (type==='not') func = `this.where({'{left}':{right}})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNot('{left}',{right})})`
                            if (type==='or') func = `.orWhere(function(){this.whereNot('{left}',{right})})`
                            if (type==='not') func = `.where('{left}',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'gte': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','>=',{right})`
                            if (type==='not') func = `this.whereNot('{left}','>=',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','>=',{right})`
                            if (type==='or') func = `.orWhere('{left}','>=',{right})`
                            if (type==='not') func = `.whereNot('{left}','>=',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'gt': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','>',{right})`
                            if (type==='not') func = `this.whereNot('{left}','>',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','>',{right})`
                            if (type==='or') func = `.orWhere('{left}','>',{right})`
                            if (type==='not') func = `.whereNot('{left}','>',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'lte': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','<=',{right})`
                            if (type==='not') func = `this.whereNot('{left}','<=',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','<=',{right})`
                            if (type==='or') func = `.orWhere('{left}','<=',{right})`
                            if (type==='not') func = `.whereNot('{left}','<=',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'lt': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','<',{right})`
                            if (type==='not') func = `this.whereNot('{left}','<',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','<',{right})`
                            if (type==='or') func = `.orWhere('{left}','<',{right})`
                            if (type==='not') func = `.whereNot('{left}','<',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'in': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereIn('{left}',{right})`
                            else func = `this.whereNotIn('{left}',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereIn('{left}',{right})})`
                            if (type==='or') func = `.orWhereIn('{left}',{right})`
                            if (type==='not') func = `.whereNotIn('{left}',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    case 'notIn': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNotIn('{left}',{right})`
                            else func = `this.whereIn('{left}',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNotIn('{left}',{right})})`
                            if (type==='or') func = `.orWhereNotIn('{left}',{right})`
                            if (type==='not') func = `.whereIn('{left}',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    case 'like': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','like',{right})`
                            if (type==='not') func = `this.whereNot('{left}','like',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','like',{right})`
                            if (type==='or') func = `.orWhere('{left}','like',{right})`
                            if (type==='not') func = `.whereNot('{left}','like',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'notLike': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNot('{left}','like',{right})`
                            if (type==='not') func = `this.where('{left}','like',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNot('{left}','like',{right})})`
                            if (type==='or') func = `.orWhereNot('{left}','like',{right})`
                            if (type==='not') func = `.where('{left}','like',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        funcDefine += itemStr
                        break
                    }
                    case 'contains': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','like',${JSON.stringify('%'+right+'%')})`
                            if (type==='not') func = `this.whereNot('{left}','like',${JSON.stringify('%'+right+'%')})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','like',${JSON.stringify('%'+right+'%')})`
                            if (type==='or') func = `.orWhere('{left}','like',${JSON.stringify('%'+right+'%')})`
                            if (type==='not') func = `.whereNot('{left}','like',${JSON.stringify('%'+right+'%')})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'doesNotContain': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNot('{left}','like',${JSON.stringify('%'+right+'%')})`
                            if (type==='not') func = `this.where('{left}','like',${JSON.stringify('%'+right+'%')})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNot('{left}','like',${JSON.stringify('%'+right+'%')})})`
                            if (type==='or') func = `.orWhereNot('{left}','like',${JSON.stringify('%'+right+'%')})`
                            if (type==='not') func = `.where('{left}','like',${JSON.stringify('%'+right+'%')})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'startsWith': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','like',${JSON.stringify(right+'%')})`
                            if (type==='not') func = `this.whereNot('{left}','like',${JSON.stringify(right+'%')})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','like',${JSON.stringify(right+'%')})`
                            if (type==='or') func = `.orWhere('{left}','like',${JSON.stringify(right+'%')})`
                            if (type==='not') func = `.whereNot('{left}','like',${JSON.stringify(right+'%')})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'doesNotStartWith': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNot('{left}','like',${JSON.stringify(right+'%')})`
                            if (type==='not') func = `this.where('{left}','like',${JSON.stringify(right+'%')})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNot('{left}','like',${JSON.stringify(right+'%')})})`
                            if (type==='or') func = `.orWhereNot('{left}','like',${JSON.stringify(right+'%')})`
                            if (type==='not') func = `.where('{left}','like',${JSON.stringify(right+'%')})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'endsWith': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.where('{left}','like',${JSON.stringify('%'+right)})`
                            if (type==='not') func = `this.whereNot('{left}','like',${JSON.stringify('%'+right)})`
                        }
                        else {
                            if (type==='and') func = `.andWhere('{left}','like',${JSON.stringify('%'+right)})`
                            if (type==='or') func = `.orWhere('{left}','like',${JSON.stringify('%'+right)})`
                            if (type==='not') func = `.whereNot('{left}','like',${JSON.stringify('%'+right)})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'doesNotEndWith': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNot('{left}','like',${JSON.stringify('%'+right)})`
                            if (type==='not') func = `this.where('{left}','like',${JSON.stringify('%'+right)})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNot('{left}','like',${JSON.stringify('%'+right)})})`
                            if (type==='or') func = `.orWhereNot('{left}','like',${JSON.stringify('%'+right)})`
                            if (type==='not') func = `.where('{left}','like',${JSON.stringify('%'+right)})`
                        }
                        let itemStr = func.replace('{left}',left)
                        funcDefine += itemStr
                        break
                    }
                    case 'between': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereBetween('{left}',{right})`
                            else func = `this.whereNotBetween('{left}',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereBetween('{left}',{right})})`
                            if (type==='or') func = `.orWhereBetween('{left}',{right})`
                            if (type==='not') func = `.whereNotBetween('{left}',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    case 'notBetween': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNotBetween('{left}',{right})`
                            else func = `this.whereBetween('{left}',{right})`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNotBetween('{left}',{right})})`
                            if (type==='or') func = `.orWhereNotBetween('{left}',{right})`
                            if (type==='not') func = `.whereBetween('{left}',{right})`
                        }
                        let itemStr = func.replace('{left}',left).replace('{right}',JSON.stringify(right))
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    case 'isNull': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNull('{left}')`
                            else func = `this.whereNotNull('{left}')`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNull('{left}')})`
                            if (type==='or') func = `.orWhereNull('{left}')`
                            if (type==='not') func = `.whereNotNull('{left}')`
                        }
                        let itemStr = func.replace('{left}',left)
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    case 'isNotNull': {
                        // 第一项
                        let func = ''
                        if (i === 0) {
                            // 根据上层定义的关系来生成连接词
                            if (type==='and' || type==='or') func = `this.whereNotNull('{left}')`
                            else func = `this.whereNull('{left}')`
                        }
                        else {
                            if (type==='and') func = `.andWhere(function(){this.whereNotNull('{left}')})`
                            if (type==='or') func = `.orWhereNotNull('{left}')`
                            if (type==='not') func = `.whereNull('{left}')`
                        }
                        let itemStr = func.replace('{left}',left)
                        // console.log(itemStr)
                        funcDefine += itemStr
                        break
                    }
                    default:
                        JS.throwError('WhereDefError',null,null,[
                            ['zh-cn', `运算符 '${operator}' 不存在`],
                            ['en-us', `Operator '${operator}' does not exist`]
                        ],lang)
                }
            }
        }
        funcDefine += ' }'
        return funcDefine
    }
    catch (err) {
        JS.throwError('SubWhereParserError',err,null,[
            ['zh-cn', `'where' 子条件解析出错`],
            ['en-us', `Error occurred while parsing 'where' sub conditions`]
        ],lang)
    }
}

/**
 * 执行单个操作指令
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Boolean} isTop 是否顶层指令
 * @param {Number} level 当前执行的层级（主要用于控制日志输出前面的空格）
 * @param {Object} parent 父对象
 */
async function executeCmd(workshop,cmd,isTop,level,parent) {
    // 操作类指令
    let root = workshop.root
    let lang = workshop.lang
    let cacher = workshop.cacher
    let result = null
    // 是否批量插入
    let isBatchInsert = false
    let chunks = []
    if (cmd.type === 'create' && _.isArray(cmd.data) && cmd.data.length > 100) isBatchInsert = true
    try {
        // console.log('executeCmd',cmd.name)
        // 判断查询类型
        if (cmd.target.indexOf('/') >= 0) JS.throwError('TargetDefError',null,null,[
            ['zh-cn', `操作类指令 'target' 不能是引用对象`],
            ['en-us', `A referred object can not be the 'target' in '${cmd.type}' commands`]
        ],lang)
        else {
            // 数据表操作开始
            // 1、定位到数据表
            let conn = workshop.conn
            let trx = workshop.trx
            let query = conn(cmd.target)
            if (trx !== null) query = trx(cmd.target)
            // 2、是否有定义查询规则
            if (!_.isUndefined(cmd.query)) {
                // 3.1、解析 where
                let func = getWhereFunc(workshop,cmd,parent)
                if (func !== null) query = eval('query.where(' + func + ')')
                // 3.2、解析 order
                let order = parser.parseOrder(cmd.query.order,lang)
                if (order.length > 0) query = query.orderBy(order)
                // 3.3、解析 size 和 page
                let pas = parser.parseOffsetAndLimit(cmd.query.page,cmd.query.size,lang)
                // 取有限记录
                if (pas.limit > 0) query = query.limit(pas.limit)
                // 有翻页
                if (pas.offset > 0) query = query.offset(pas.offset)
            }
            // 3、执行操作
            if (cmd.type === 'delete') query = query.delete()
            // increase 和 decrease 有特殊的用法
            else if (cmd.type === 'increase') query = query.increment(cmd.data)
            else if (cmd.type === 'decrease') query = query.decrement(cmd.data)
            else {
                // 数据预处理
                if (_.isPlainObject(cmd.data)) cmd.data = [cmd.data]
                for (let i=0; i<cmd.data.length; i++) {
                    let item = cmd.data[i]
                    // Mysql 时间格式
                    // 自动填充 createdAt 和 updatedAt（以可读当地时间字符串形式）
                    if (cmd.type === 'create' && !item.createdAt) {
                        item.createdAt = (new Date()).dtString()
                    }
                    if (!item.updatedAt) {
                        item.updatedAt = (new Date()).dtString()
                    }
                    // 执行内置函数，防 xss 处理
                    let keys = Object.keys(item)
                    for (let j=0; j<keys.length; j++) {
                        let key = keys[j]
                        // Mysql 时间格式处理为可读字符串
                        if (_.isDate(item[key])) {
                            item[key] = item[key].dtString()
                        }
                        if (_.isString(item[key])) {
                            switch (item[key]) {
                                case 'JBDAP.mysql.now()': {
                                    item[key] = (new Date()).dtString()
                                    break
                                }
                                case 'JBDAP.fn.timestamp()': {
                                    item[key] = (new Date()).getTime()
                                    break
                                }
                                default: {
                                    // 服务端 method
                                    if (item[key].indexOf('JBDAP.fn.plusInt(') === 0) {
                                        let params = item[key].split('(')[1].split(')')[0].split(',')
                                        for (let i=0; i<params.length; i++) {
                                            params[i] = calculator.tag2value(params[i],root,parent,null,lang)
                                        }
                                        item[key] = parseInt(params[0]) + parseInt(params[1])
                                        break
                                    }
                                    if (item[key].indexOf('JBDAP.fn.plusFloat(') === 0) {
                                        let params = item[key].split('(')[1].split(')')[0].split(',')
                                        for (let i=0; i<params.length; i++) {
                                            params[i] = calculator.tag2value(params[i],root,parent,null,lang)
                                        }
                                        item[key] = parseFloat(params[0]) + parseFloat(params[1])
                                        break
                                    }
                                    if (item[key].indexOf('JBDAP.fn.minusInt(') === 0) {
                                        let params = item[key].split('(')[1].split(')')[0].split(',')
                                        for (let i=0; i<params.length; i++) {
                                            params[i] = calculator.tag2value(params[i],root,parent,null,lang)
                                        }
                                        item[key] = parseInt(params[0]) - parseInt(params[1])
                                        break
                                    }
                                    if (item[key].indexOf('JBDAP.fn.minusFloat(') === 0) {
                                        let params = item[key].split('(')[1].split(')')[0].split(',')
                                        for (let i=0; i<params.length; i++) {
                                            params[i] = calculator.tag2value(params[i],root,parent,null,lang)
                                        }
                                        item[key] = parseFloat(params[0]) - parseFloat(params[1])
                                        break
                                    }
                                    // 判断无效的 method
                                    if (item[key].indexOf('JBDAP.fn.') === 0 || item[key].indexOf('JBDAP.mysql.') === 0) JS.throwError('DBMethodError',null,null,[
                                        ['zh-cn', `'${item[key]}' 是无效的函数名`],
                                        ['en-us', `'${item[key]}' is not a valid method name`]
                                    ],lang)
                                    // 没有使用服务端方法
                                    item[key] = validator.safeString(item[key])
                                    break
                                }
                            }
                        }
                    }
                }
                // if (cmd.type === 'create') query = query.insert(cmd.data,[JE.primaryKey])
                // if (cmd.type === 'update') query = query.update(cmd.data[0],[JE.primaryKey])
                // 考虑批量插入的情况
                if (cmd.type === 'create') {
                    if (isBatchInsert) {
                        chunks = _.chunk(cmd.data, 100)
                        query = query.insert(chunks[0])
                    }
                    else query = query.insert(cmd.data)
                }
                if (cmd.type === 'update') query = query.update(cmd.data[0])
            }
            if (workshop.printSql === true) console.log('sql:',query.toString())
            result = await query
            // 批量插入
            if (chunks.length > 0) {
                for (let i=1; i<chunks.length; i++) {
                    query = query.insert(chunks[i])
                    if (workshop.printSql === true) console.log('sql:',query.toString())
                    result = await query
                }
            }
            // 清理缓存
            if (_.isFunction(cacher)) await cacher('clear',cmd)
            // console.log('result',result)
            // 4、将结果保存至缓存空间
            if (isTop) root[cmd.name].data = result
            // console.log(result)
            // 返回
            return result
        }
    }
    catch (err) {
        // 对 knex 内部返回的错误进行处理
        if (typeof err === 'object' && err.errno && err.originalStack) {
            err = new Error(`${err.originalStack.replace('Error: ','')}`)
        }
        JS.throwError('DBExecError',err,null,[
            ['zh-cn', `操作数据出错`],
            ['en-us', `Error occurred while operating data`]
        ],lang)
    }
}

/**
 * 执行单个服务端函数指令
 * @param {Object} workshop 处理过程的完整静态环境
 * @param {Object} cmd 当前正在处理的指令
 * @param {Boolean} isTop 是否顶层指令
 * @param {Number} level 当前执行的层级（主要用于控制日志输出前面的空格）
 * @param {Object} parent 父对象
 */
async function executeFunction(workshop,cmd,isTop,level,parent) {
    let root = workshop.root
    let lang = workshop.lang
    let dispatcher = workshop.dispatcher
    if (workshop.isTransaction === true) JS.throwError('TargetDefError',null,null,[
        ['zh-cn', `服务端函数不能放在 JBDAP 事务中执行`],
        ['en-us', `Server-side function commands should not run in a JBDAP transcation`]
    ],lang)
    // 服务端函数指令
    let result = null
    try {
        // 判断指令类型
        if (cmd.target.indexOf('/') >= 0) JS.throwError('TargetDefError',null,null,[
            ['zh-cn', `服务端函数指令 'target' 不能是引用对象`],
            ['en-us', `A referred object can not be the 'target' in server-side function commands`]
        ],lang)
        else {
            // 调用 dispatcher 执行服务端函数
            if (_.isFunction(dispatcher)) {
                let data = cmd.data
                // 如果有必要的话给 data 的一级属性赋值
                if (_.isPlainObject(data)) {
                    let keys = Object.keys(data)
                    for (let i=0; i<keys.length; i++) {
                        let prop = data[keys[i]]
                        if (_.isString(prop)) {
                            data[keys[i]] = calculator.tag2value(prop,root,parent,null,lang)
                            if (validator.hasSqlInjection(data[keys[i]])) JS.throwError('SqlInjectionError',null,null,[
                                ['zh-cn', `发现 sql 注入字符`],
                                ['en-us', `Sql Injection characters found`]
                            ],lang)
                        }
                    }
                }
                // 执行函数
                result = await dispatcher(workshop.user,workshop.conn,cmd.target,cmd.data,lang)
                // 如果是顶级指令则保存到 root
                if (isTop) root[cmd.name].data = result
                // 返回结果
                return result
            }
            // 没有 dispatcher 函数则抛出错误
            else JS.throwError('JBDAPConfigError',null,null,[
                ['zh-cn', `没有配置 dispatcher 调度器`],
                ['en-us', `No 'dispatcher' set, but some server-side functions were called`]
            ],lang)
        }
    }
    catch (err) {
        JS.throwError('FunctionError',err,null,[
            ['zh-cn', `执行服务端函数 '${cmd.name}' 出错`],
            ['en-us', `Error occurred while executing server-side function '${cmd.name}'`]
        ],lang)
    }
}
