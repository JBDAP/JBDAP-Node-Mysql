# JBDAP-Node-Mysql 实例代码手册

本文旨在通过一个贴近现实的应用来展示 JBDAP 的强大能力，通读全篇大概需要 1 小时，然而这 1 小时带给你的将是未来数据接口开发工作量 80% 以上的削减，相信你不会后悔。

<div id="nav" style="width:100%;height:1px;border:none;"></div>

## 目录导航

- [前言 - 数据库结构](#schema)
- [JBDAP 指令](#command)
  - [单条指令](#command-single)
  - [多条指令](#command-multiple)
- [创建数据](#create)
  - [单条或多条插入](#create-normal)
  - [大量数据自动分批插入](#create-batch)
- [查询数据](#query)
  - [基本查询类型](#query-types)
    - [entity - 查询单条记录](#query-entity)
    - [list - 查询多条记录](#query-list)
    - [distinct - 对指定字段去重查询](#query-distinct)
  - [fields - 查询字段控制](#query-fields)
  - [query - 查询条件约束](#query-query)
    - [where 条件 - 支持单表任意复杂查询](#query-where)
    - [order - 排序](#query-order)
    - [size/page - 分页支持](#query-paging)
  - [values - 统计、汇总、二次加工](#query-values)
  - [cascaded 级联查询](#query-cascaded)
- [操作已有数据](#operate)
  - [query - 操作条件约束](#operate-query)
  - [操作类型](#operate-types)
    - [delete - 删除](#operate-delete)
    - [update - 更新](#operate-update)
    - [increase - 原子自增](#operate-increase)
    - [decrease - 原子自减](#operate-decrease)
- [逻辑能力](#logic)
  - [expression - 通过表达式实现特定值的输入](#logic-expression)
  - [onlyIf - 前置条件约束](#logic-onlyIf)
  - [after - 后续指令操作](#logic-after)
  - [reference - 指令间的结果集引用](#logic-reference)
    - [引用值参与查询条件](#logic-reference-as-condition)
    - [引用值作为数据源](#logic-reference-as-source)
  - [visibility - 指令结果可见性](#logic-visibility)
  - [transaction - 事务支持](#logic-transaction)
- [开发辅助](#assistant)
  - [自动填充时间戳](#assistant-auto-timestamp)
  - [日志输出 - 前端可以查看执行过程](#assistant-logs)
  - [错误跟踪 - 前端可以查看错误跟踪](#assistant-trace)
- [高级能力](#advance)
  - [decorator - 数据预处理](#advance-decorator)
  - [服务端函数 - 个性化逻辑处理](#advance-server-function)
  - [缓存支持 - 有助于提升查询性能](#advance-cache)
  - [安全性 - 应用程序的命脉](#advance-security)
    - [身份校验](#advance-recognizer)
    - [权限控制](#advance-doorman)
    - [敏感数据屏蔽](#advance-scanner)
- [附 - 数据库管理助手](#helper)
  - [创建数据表](#helper-create)
    - [用 json 描述数据结构](#helper-model)
    - [调用方法](#helper-call-create)
  - [删除数据表](#helper-drop)

目录到此结束

<div style="width:100%;height:20px;border:none;"></div>
<div id="schema" style="width:100%;height:1px;border:none;"></div>

# 数据库结构

为了演示 JBDAP 的能力，我在这里设计了一个多用户博客应用的数据库并填充了一些测试数据，各个表的用途及其及关联在下图中一目了然：

![数据库结构示意图](https://github.com/JBDAP/JBDAP-Node-Mysql/raw/master/doc/ER.png)

其设计遵循了几个基本原则：

- 表名以大写字母开头，字段名遵循"驼峰命名法"
- 数据表均以 id 字段作为主键
- 数据表均包含 createdAt 和 updatedAt 两个时间戳字段
- 外键字段均以 "被关联表名(小写首字母) + Id" 的形式命名
- 为了炫耀 JBDAP 的能力，我们基本没有采用任何冗余字段设计来降低某些复杂查询的难度

了解以上原则有助于你在看下面的例子时可以快速理解其用意。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="command" style="width:100%;height:1px;border:none;"></div>

# JBDAP 指令

JBDAP 是一问一答式的，它用 json 描述一次数据操作请求发送出去，然后接收一个 json 格式的返回结果。

### 最简单的 Request 代码：

```
{
    commands: [
        {
            name: "allUsers",   // 指令名称
            type: "list",       // 操作类型，'list' 意味着获取数据列表
            target: "User"      // 目标数据表名
        }
    ]
}
```

### 接收到的 Response 结果：

```
{
    "code": 200,
    "message": "ok",
    "data": {
        "allUsers":     // 注意，allUsers 这个 key 对应了 request 指令中的 name
        [
            {
                "id": 1,
                "username": "user1",
                "password": "password1",
                "avatar": null,
                "email": null,
                "gender": "FEMALE",
                "createdAt": "2020-07-08 14:42:44",
                "updatedAt": "2020-07-08 14:42:44"
            },
            ...
        ]
    }
}
```
无论是请求还是返回结果都非常的语义化，几乎不需要做任何解释。


<div id="command-single" style="width:100%;height:1px;border:none;"></div>

## 1、单条指令

上面的例子就是最简单的单条指令，我们一次请求发送一条指令并获得结果，这是最常见的用法。


<div id="command-multiple" style="width:100%;height:1px;border:none;"></div>

## 2、多条指令

在实际的开发场景中，比如 web 开发，经常会出现一个界面获取多组数据的需求，多次进行 ajax 请求当然是可行的，然而这对于用户体验并不友好，而且还会加重服务器的性能负担，所以一次请求得到全部需要的数据当然是最好的选择。

然而在传统 WebService/WebAPI 开发模式下，要达到这一目的需要前后端协作创建和应用一个新的接口出来才行，流程如下：
- 前后端开发人员协商接口规范
- 后端开发并自测
- 后端编写接口文档提供给前端
- 前端根据接口文档编写交互逻辑
- 前端进行测试
- 在模拟真实环境中前后端进行联调
- 新接口上线

多么熟悉又糟心的场景，更不要提各种需求变更导致的接口版本地狱。这对于前后端人员都是一种折磨，然而现在我们有了 JBDAP 这一大救星，事情变得极其简单了。

举例，我想要一次取到所有的用户和博文类目，只要这样就可以了：

Request:
```
{
    commands: [
        {
            name: "allUsers",
            type: "list",
            target: "User"
        },
        {
            name: "allCategories",
            type: "list",
            target: "Category"
        }
    ]
}
/**
 * 注意：
 * 一次请求包含多条指令的时候，其执行顺序与指令出现的顺序一致
 */
```

等效 SQL:
~~~
select * from `User`
select * from `Category`
~~~

Response：
```
{
    "code": 200,
    "message": "ok",
    "data": {
        "allUsers": [
            {
                "id": 1,
                "username": "user1",
                "password": "password1",
                "avatar": null,
                "email": null,
                "gender": "FEMALE",
                "createdAt": "2020-07-09 12:41:46",
                "updatedAt": "2020-07-09 12:41:46"
            },
            ...
        ],
        "allCategories": [
            {
                "id": 1,
                "name": "政治",
                "sequence": 1,
                "createdAt": "2020-07-09 12:41:46",
                "updatedAt": "2020-07-09 12:41:46"
            },
            ...
        ]
    }
}
```

也就是说，只要前端知道数据结构，想怎么查询就怎么查询，再也不用看后端的臭脸了，人家后端人员也乐得清闲。当然前提是你们用了我的 JBDAP，哈哈哈。

好啦，JBDAP 的交互模式就介绍到这里，下面开始逐一展示它的全面能力。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="create" style="width:100%;height:1px;border:none;"></div>

# 创建数据

创建（插入）数据是基本操作，指令写法也很简单，把 `type` 改成 `'create'`，然后用 `data` 指定要插入的数据就可以了。

<div id="create-normal" style="width:100%;height:1px;border:none;"></div>

## 1、单条或多条插入

一条指令可以插入单条数据，也可以插入多条数据，区别在于 data 的数据类型，是 PlainObject 就插入单条，如果是 Array 则插入多条。

Request:
```
{
    commands: [
        {
            name: 'insertSingle',
            type: 'create',
            target: 'Category',
            data: {
                name: '政治',
                sequence: 1,
            },
        },
        {
            name: 'insertMultiple',
            type: 'create',
            target: 'Category',
            data: [
                {
                    name: '经济',
                    sequence: 2,
                },
                {
                    name: '历史',
                    sequence: 3,
                },
            ]
        },
    ]
}
```

等效 SQL:
~~~
insert into `Category` (`createdAt`, `name`, `sequence`, `updatedAt`) values ('2020-07-09 13:02:18', '政治', 1, '2020-07-09 13:02:18')
insert into `Category` (`createdAt`, `name`, `sequence`, `updatedAt`) values ('2020-07-09 13:02:18', '经济', 2, '2020-07-09 13:02:18'), ('2020-07-09 13:02:18', '历史', 3, '2020-07-09 13:02:18')
~~~

Response：
```
{
    "code": 200,
    "message": "ok",
    "data": {
        "insertSingle": [
            1
        ],
        "insertMultiple": [
            2
        ]
    }
}
/**
 * 说明：
 * "insertMultiple": [ 2 ] 意味着该条指令插入了 2 条数据
 * 这与 Sqlite 是不同的，Sqlite 返回的是最大 id
 */
```

<div id="create-batch" style="width:100%;height:1px;border:none;"></div>

## 2、大量数据自动分批插入

当我们有大量数据需要插入的时候，为了保证服务器性能，JBDAP 会自动把数据进行分批 Batch 插入（每次 100 条），此过程对于开发者来说是无感的。

由于代码跟前面的多条插入没有任何区别，这里就不贴了。不过还是要注意，我们并不建议这样操作，首先大量数据的传输（尤其是 B/S 或者 C/S 结构下）就是一个很大的负担，其次这种操作还很考验服务器性能，会造成响应能力下降，所以还是要慎用。

当然了，如果是区区几百条的批量插入需求还是没有任何问题的。如果是非常巨大的数据量，建议通过服务端函数（后边会有介绍）来实现。

[返回导航↑](#nav)


<div style="width:100%;height:20px;border:none;"></div>
<div id="query" style="width:100%;height:1px;border:none;"></div>

# 查询数据

查询数据是最常见的需求，下面我们循序渐进的展示 JBDAP 的灵活与强大。

<div id="query-types" style="width:100%;height:1px;border:none;"></div>

## **基本查询类型**

<div id="query-entity" style="width:100%;height:1px;border:none;"></div>

### 1、entity - 查询单条记录

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',     // entity 代表要获取单个数据
            target: 'User',
        }
    ]
}
~~~

等效 SQL:
~~~
select * from `User` limit 1
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "password": "password1",
            "avatar": null,
            "email": null,
            "gender": "female",
            "createdAt": "2019-02-28 13:27:05",
            "updatedAt": "2019-02-28 13:27:05"
        }
    }
}
/**
 * 说明：
 * 1、如果符合查询条件的结果有多个，那么返回第一个
 * 2、如果没有符合条件的，则 data.userInfo 为 null
 */
~~~

[返回导航↑](#nav)

<div id="query-list" style="width:100%;height:1px;border:none;"></div>

### 2、list - 查询多条记录

Request:
~~~
{
    commands: [
        {
            name: 'allUsers',
            type: 'list',       // list 代表要获取数据列表
            target: 'User'      // 数据表名
        }
    ]
}
~~~

等效 SQL:
~~~
select * from `User`
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "allUsers": [
            {
                "id": 1,
                "username": "user1",
                "password": "password1",
                "avatar": null,
                "email": null,
                "gender": "female",
                "createdAt": "2019-02-28 13:27:05",
                "updatedAt": "2019-02-28 13:27:05"
            },
            ... // 更多数据省略
        ]
    }
}
/**
 * 说明：
 * 如果没有符合条件的记录，data.allUsers 为 null
 */
~~~

[返回导航↑](#nav)

<div id="query-distinct" style="width:100%;height:1px;border:none;"></div>

### 3、distinct - 对指定字段去重查询

Request:
~~~
{
    commands: [
        {
            name: 'activeUserIds',
            type: 'distinct',       // 指明是 distinct 查询
            target: 'Blog',
            fields: 'userId'        // distinct 的字段对象是 'userId'
        }
    ]
}

~~~

等效 SQL:
~~~
select distinct `userId` from `Blog`
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "activeUserIds": [
            {
                "userId": 1
            },
            ...
        ]
    }
}
~~~

[返回导航↑](#nav)

<div id="query-fields" style="width:100%;height:1px;border:none;"></div>

## **fields - 查询字段控制**

考虑到服务器压力以及网络传输数据量，我们通常并不需要返回所有的数据字段，或者数据库里的字段命名跟我们前端的需求并不相符，此时 JBDAP 可以方便的进行控制

**例一：entity 查询指定字段**

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            fields: 'id,username,avatar,email,gender'   // 限定字段
        }
    ]
}
/**
 * 说明：
 * 1、fields 不设定或者 fields: '*' 均意味着返回全部字段
 * 2、fields 除了用字符串表示，还可以接收数组类型，如：
 *    fields: ['id','username','email']
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar`, `email`, `gender` from `User` limit 1
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "avatar": null,
            "email": null,
            "gender": "FEMALE"
        }
    }
}
~~~

**例二： list 查询指定字段以及别名**

Request:
~~~
{
    commands: [
        {
            name: 'allUsers',
            type: 'list',
            target: 'User',
            fields: [
                'id',
                'username',
                'avatar',
                'updatedAt=>lastVisitedAt'      // 指定别名
            ]
        }
    ]
}
/**
 * 说明：
 * 1、list 查询和 entity 查询指定字段的方式完全一致
 * 2、允许数据字段以别名返回，如上面 'updatedAt=>lastVisitedAt'
 *    将会把 updatedAt 改名为 lastVisitedAt 返回
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar`, `updatedAt` as `lastVisitedAt` from `User`
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "allUsers": [
            {
                "id": 1,
                "username": "user1",
                "avatar": null,
                "lastVisitedAt": "2020-07-09 16:00:40"
            },
            ...
        ]
    }
}
~~~

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="query-query" style="width:100%;height:1px;border:none;"></div>

## **query - 查询条件约束**

现实开发中，我们的查询当然不会那么简单，一系列的约束条件是必须的，JBDAP 对此给出了很好的支持，不夸张的说，它几乎可以实现任意的单表复杂查询。

<div id="query-where" style="width:100%;height:1px;border:none;"></div>

### 1、where 条件


**例一： 多条件查询与运算符**

Request:
~~~
{
    commands: [
        {
            name: 'goodBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                where: {        // 两个关系为 and 的查询条件
                    'views#gte': 500,
                    'hearts#gte': 50
                }
            },
            fields: 'id,title,content,views,hearts=>likes'   // 别名返回
        }
    ]
}
/**
 * 说明：
 * 1、可以看到 query.where 有两个属性，它们之间是 and 关系
 * 2、属性的 key 用 # 隔开了 field 名称与运算符，支持的运算符有：
 *    值比较：eq, ne, lte, lt, gte, gt
 *    包含判断：in, notIn
 *    字符串匹配：like, notLike, contains, doesNotContain, startsWith, doesNotStartWith, endsWith, doesNotEndWith
 *    区域判断：between, notBetween
 *    Null 值判断：isNull, isNotNull
 */
~~~

等效 SQL:
~~~
select `id`, `title`, `content`, `views`, `hearts` as `likes` 
from `Blog` 
where (`views` >= 500 and `hearts` >= 50)
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "goodBlogs": [
            {
                "id": 1,
                "title": "blog1",
                "content": "blog content 1 from user 4",
                "views": 752,
                "likes": 55     // 注意字段已经重命名
            },
            ...
        ]
    }
}
~~~

**例二： 复杂条件查询**

Request:
~~~
{
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                where: {            // 这里是一个非常复杂的查询条件
                    'userId': 1,
                    'views#gte': 100,
                    $or: {
                        'title#like': 'blog%',
                        $and: {
                            'content#like': '%user%',
                            'createdAt#gte': new Date(2019,1,28,13,27,05)
                        }
                    },
                    $not: {
                        $and: {
                            'hearts#lte': 10,
                            'views#lte': 50
                        }
                    }
                }
            },
            fields: 'id,title,content,views,hearts=>likes'
        }
    ]
}
/**
 * 说明：
 * 1、注意这个查询条件基本没有实际意义，只是为了演示 where 复杂查询能力的强大
 * 2、如果是相等运算，{ userId: 1 } 与 { 'userId#eq': 1 } 是等效的
 * 3、你会发现，这个例子多了三个分组运算符：$and, $or, $not
 *    分组运算符分别对其多个子条件进行 and, or, not 运算，然后将结果返回给父级运算
 * 4、注意如果想实现 not (condition1 and condition2) 这样的查询条件必须这样写：
 *    $not: {
 *        $and: {
 *            'field1#op': val1,
 *            'field2#op': val2,
 *        }
 *    }
 *    背后的原因来自 knex，不再具体解释了，记住即可
 */
~~~

等效 SQL:
~~~
select `id`, `title`, `content`, `views`, `hearts` as `likes` 
from `Blog` 
where (
    `userId` = 1 
    and `views` >= 100 
    and (
        `title` like 'blog%' 
        or (
            `content` like '%user%' 
            and `createdAt` >= '2019-02-28 13:27:05'
        )
    ) 
    and (
        not (
            `hearts` <= 10 
            and `views` <= 50
        )
    )
)
/**
 * WOW，看这个 SQL 语句，很牛逼的样子
 * 我打赌你一般用不到这么复杂的查询，但是 JBDAP 确实允许你无限写下去
 */
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "someBlogs": [
            {
                "id": 2,
                "title": "blog2",
                "content": "blog content 2 from user 1",
                "views": 953,
                "likes": 94
            },
            ...
        ]
    }
}
~~~

[返回导航↑](#nav)

<div id="query-order" style="width:100%;height:1px;border:none;"></div>

### 2、order - 排序

Request:
~~~
{
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            fields: 'id,title,keywords,views,hearts',
            query: {
                order: 'categoryId#asc,userId#desc',     // 定义排序规则
                size: 10
            }
        }
    ]
}
/**
 * 说明：
 * 1、query.order 可以用来指定一条或多条数据排序规则
 * 2、当字段为 asc 排序时可以只写字段名称
 *    因此 'categoryId#asc,userId#desc' 可以简写为 'categoryId,userId#desc'
 * 3、query.order 也可以接受数组参数
 * 4、order: ['categoryId#asc','userId#desc'] 写法与上面例子是等效的
 *    用数组形式来写会更规范
 */
~~~

等效 SQL:
~~~
select `id`, `title`, `keywords`, `views`, `hearts` 
from `Blog` 
order by `categoryId` asc, `userId` desc 
limit 10
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "someBlogs": [
            {
                "id": 79,
                "title": "blog79",
                "keywords": null,
                "views": 860,
                "hearts": 8
            },
            ...
        ]
    }
}
~~~

[返回导航↑](#nav)

<div id="query-paging" style="width:100%;height:1px;border:none;"></div>

### 3、size/page 分页支持

**例一： 只定义 query.size**

Request:
~~~
{
    commands: [
        {
            name: 'someUsers',
            type: 'list',
            target: 'User',
            query: {
                order: 'id#desc',
                size: 2             // 控制返回数据行数
            },
            fields: 'id,username,avatar'
        }
    ]
}
/**
 * 说明：
 * query.size 为 2 意味着只返回前 2 条
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar` from `User` order by `id` desc limit 2
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "someUsers": [
            {
                "id": 15,
                "username": "user11",
                "avatar": null
            },
            {
                "id": 14,
                "username": "user12",
                "avatar": null
            }
        ]
    }
}
~~~

**例二： 同时定义 query.size 和 query.page**

Request:
~~~
{
    commands: [
        {
            name: 'someUsers',
            type: 'list',
            target: 'User',
            query: {
                order: 'id#desc',
                size: 2,            // 每页条数
                page: 3             // 返回第几页
            },
            fields: 'id,username,avatar'
        }
    ]
}
/**
 * 说明：
 * query.page 为 3 意味着返回第 3 页，每页 query.size 条
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar` from `User` 
order by `id` desc 
limit 2 offset 4
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "someUsers": [
            {
                "id": 8,
                "username": "user8",
                "avatar": null
            },
            {
                "id": 7,
                "username": "user7",
                "avatar": null
            }
        ]
    }
}
~~~

[返回导航↑](#nav)


<div id="query-values" style="width:100%;height:1px;border:none;"></div>

## **values - 统计、汇总、二次加工**

除了对数据实体的查询需求之外，我们还会经常用到对给定数据进行各种统计、汇总和二次加工的需求，因此 JBDAP 引入了一个 `values` 类型的查询来满足此类需求。加入我们要对 id 为 1 的用户博客情况进行汇总统计和二次加工，举例如下：

**例一： 统计汇总**

Request:
~~~
{
    commands: [
        {
            name: 'blogStat',
            type: 'values',         // 这里指明是 values 查询
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                },
                order: 'id#desc'
            },
            fields: [
                'count#id=>totalBlogs',                 // 计数
                'sum#hearts=>totalHearts',              // 求和
                'max#hearts=>maxViews',                 // 求最大
                'avg#hearts=>avgHearts',                // 求均值
            ]
        }
    ]
}
/**
 * 说明：
 * 请注意 fields 的定义，count, sum, max, min, avg 的涵义无需多言
 */
~~~

等效 SQL:
~~~
select 
    count(`id`) as `totalBlogs`, 
    sum(`hearts`) as `totalHearts`, 
    max(`hearts`) as `maxViews`, 
    avg(`hearts`) as `avgHearts` 
from `Blog` 
where (`userId` = 1) 
order by `id` desc
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "blogStat": {
            "totalBlogs": 7,
            "totalHearts": "339",
            "maxViews": 87,
            "avgHearts": "48.4286"
        }
    }
}
/**
 * 注意：除 count 查询外，其余 sum/max/min/avg 并不一定会以数字类型返回
 * 也有可能是以字符串方式返回，必要的时候需要自己处理一下
 */
~~~

**例二： 数据二次加工**

Request:
~~~
{
    commands: [
        {
            name: 'blogStat',
            type: 'values',         // 这里指明是 values 查询
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                },
                order: 'id#desc'
            },
            fields: [
                'first#title=>latestTitle',             // 第一条记录的指定字段
                'pick#id=>blogIds',                     // 拣取指定字段拼装成数组
                'clone#id,title,content,hearts=>List'   // 克隆每行数据的指定字段
            ]
        }
    ]
}
/**
 * 说明：
 * 注意这三个比较特殊的用法：
 *    first - 取第一条记录的单个指定字段，比如可以用来取当前最大 id
 *    pick - 将指定字段取出放入一个数组，比如可以取出 id 的数组用于 where 中的 in 查询
 *    clone - 克隆每条记录的指定字段，比如获得一个小的简略数据列表
 */
~~~

等效 SQL:
~~~
select * from `Blog` where (`userId` = 1) order by `id` desc
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "blogStat": {
            "latestTitle": "blog99",        // 最新一篇标题
            "blogIds": [                    // 所有博客 id 组成的数组
                99,
                98,
                68,
                66,
                2
            ],
            "List": [                       // 克隆出原始数据的字段子集
                {
                    "id": 99,
                    "title": "blog99",
                    "content": "blog content 99 from user 1",
                    "hearts": 122
                },
                ...
            ]
        }
    }
}
~~~

注意：以下两种情况 JBDAP 会先查询出全部数据然后再进行计算：
- 当 values 查询的 fields 包含了 `first|pick|clone` 三者之一时
- 不包含前述三种 fields 类型但是查询条件中有 `page|size` 约束时

由于此种操作可能会涉及大量数据的查询与计算，因此为了不影响应用程序性能，请先慎重评估数据量是否过大。

[返回导航↑](#nav)

<div id="query-cascaded" style="width:100%;height:1px;border:none;"></div>

## **cascaded 级联查询**

关系型数据库设计中必然会存在各种父子表、关联表的模型，于是在开发中也就自然出现了联合查询的需求，然而 JBDAP 的设计精神是用分步简单查询来取代联合查询，从而使得应用逻辑更加清晰，因此我们用级联查询的方式来满足绝大多数的数据关联需求。

**例一：简单的级联填充**

这里有个需求，我们希望在展示用户信息的同时得到他的最新 5 条博文，实现这个任务有两条途径：

- 后端提供两个接口，前端进行两次查询，然后将结果拼组起来进行展示
- 前端希望一个接口解决问题，于是后端需要编写并开放出第三个接口

看起来总会有人不爽，来吧，看我们怎么解决这一问题！

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
            fields: [
                '*',
                {   // 注意这里，我们在 fields 里面增加了一个查询指令
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id' // 这个 $ 指的是父对象,即 userInfo
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    }
                }
            ]
        }
    ]
}
/**
 * 看起来很像嵌套，我们在 fields 列表中增加了一个 list 查询指令
 * 这个 list 指令 where 条件表达式中 '$.id' 也就是父对象的 id 字段，即 userInfo
 */
~~~

等效 SQL:
~~~
select * from `User` where (`id` = 1) limit 1
select * from `Blog` where (`userId` = 1) order by `updatedAt` desc limit 5
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "password": "password1",
            "avatar": null,
            "email": null,
            "gender": "female",
            "createdAt": "2019-02-28 13:27:05",
            "updatedAt": "2019-02-28 13:27:05",
            "top5blogs": [      // 注意这个 top5blogs 即是自动填充好的级联字段
                {
                    "id": 2,
                    "userId": 1,
                    "categoryId": 2,
                    "title": "blog2",
                    "keywords": null,
                    "content": "blog content 2 from user 1",
                    "views": 953,
                    "hearts": 94,
                    "createdAt": "2019-02-28 13:27:05",
                    "updatedAt": "2019-02-28 13:27:05"
                },
                ...
            ]
        }
    }
}
/**
 * 子查询的 name 被作为级联字段的 key，查询得到的 list 结果就是该字段的值
 */
~~~

小目标顺利达成！


**例二：嵌套的级联填充**

需求又变了！产品经理说，我们希望在前面展示用户最新 5 条博文的基础上，还能展示每条博文的最新 5 条评论，另外博文需要把所属类目也显示出来 :-(

这里已经没必要讨论解决方案了，无非还是要么前端多请求几次，要么后端继续造新接口、写文档，总之就是不爽...还是看我们的吧

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
            fields: [       // 对字段做一些精简
                'id',
                'username',
                'avatar',
                'updatedAt=>lastVisitedAt',
                {
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id'      // 这里 $ 指 userInfo
                        },
                        order: 'updatedAt#desc'
                    },
                    fields: [
                        'id',
                        'categoryId',
                        'title',
                        'content',
                        'views',
                        'hearts',
                        {
                            name: 'category',
                            type: 'entity',
                            target: 'Category',
                            query: {
                                where: {
                                    id: '$.categoryId'  // 这里 $ 指单个 blog
                                }
                            },
                            fields: 'id,name'
                        },
                        {
                            name: 'top5comments',
                            type: 'list',
                            target: 'Comment',
                            query: {
                                where: {
                                    blogId: '$.id'  // 这里 $ 指单个 blog
                                },
                                order: 'id#desc',
                                size: 5
                            },
                            fields: 'id,content,hearts'
                        }
                    ]
                }
            ]
        }
    ]
}
/**
 * 多层的嵌套，原理都是一样的，难度在于你要理解表达式中的 '$' 代表的是什么
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar`, `updatedAt` as `lastVisitedAt` 
from `User` 
where (`id` = 1)
limit 1

select `id`, `categoryId`, `title`, `content`, `views`, `hearts` 
from `Blog` 
where (`userId` = 1) 
order by `updatedAt` desc

select `id`, `name` 
from `Category` 
where (`id` = 2)
limit 1
...

select `id`, `content`, `hearts` 
from `Comment` 
where (`blogId` = 2) 
order by `id` desc 
limit 5
...
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "avatar": null,
            "lastVisitedAt": "2019-02-28 13:27:05",
            "top5blogs": [
                {
                    "id": 2,
                    "categoryId": 2,
                    "title": "blog2",
                    "content": "blog content 2 from user 1",
                    "views": 953,
                    "hearts": 94,
                    "category": {
                        "id": 2,
                        "name": "政治"
                    },
                    "top5comments": [
                        {
                            "id": 914,
                            "content": "comment 914 for blog 2",
                            "hearts": 27
                        },
                        ...
                    ]
                },
                ...
            ]
        }
    }
}
~~~

大点的目标也很轻松愉快嘛，朋友，你怎么看？

当然，爱动脑的朋友已经发现了，这种写法带来了大量的 sql 语句执行，显而易见查询效率是比较低的，没错儿！我们当然也意识到了这个问题，所以后边我们会给出更高效的解决方案，这个例子仅仅是为了演示 JBDAP 级联查询的灵活性，请不要把它等同于实际开发场景。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="operate" style="width:100%;height:1px;border:none;"></div>

# 操作已有数据

前面已经演示了数据库操作 `“增删改查”` 里的 `“增”和“查”`，剩下就是对已有数据的操作 `“删”和“改”` 了。

<div id="operate-query" style="width:100%;height:1px;border:none;"></div>

## **query - 条件约束**

跟数据查询一样，对已有数据进行删改操作时也需要有相应的条件约束，所以此类操作也都同样支持 `query` 参数，具体使用方法跟查询操作别无二致，这里不再赘述，详情可以参见 [查询数据的 query 条件](#query-query)

[返回导航↑](#nav)

<div id="operate-types" style="width:100%;height:1px;border:none;"></div>

## **操作类型**

<div id="operate-delete" style="width:100%;height:1px;border:none;"></div>

### 1、delete - 删除数据

Request:
~~~
{
    commands: [
        {
            name: 'delComment',
            type: 'delete',         // 指明是 delete 操作
            target: 'Comment',
            query: {
                where: {
                    id: 1
                }
            }
        }
    ]
}
~~~

等效 SQL:
~~~
delete from `Comment` where (`id` = 1)
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "delComment": 1
    }
}
/**
 * 说明：
 * 此处 return 值 data.delComment 为受影响数据条数
 */
~~~

[返回导航↑](#nav)

<div id="operate-update" style="width:100%;height:1px;border:none;"></div>

### 2、update - 更新数据

Request:
~~~
{
    commands: [
        {
            name: 'updateBlogs',
            type: 'update',         // 指明是 update 操作
            target: 'Blog',
            query: {
                where: {
                    userId: 17,
                }
            },
            data: {
                content: 'new blog content for user 17',
                views: 0,
                hearts: 0,
            }
        }
    ]
}
/**
 * 这里我们对 id 为 1 的用户博文记录进行了更新
 * data 里有的字段才会被更新
 */
~~~

等效 SQL:
~~~
update `Blog` 
set 
    `content` = 'new blog content for user 1', 
    `views` = 0, 
    `hearts` = 0, 
    `updatedAt` = '2020-07-10 00:49:16'     // updatedAt 字段更新是框架自动处理的
where 
    `userId` = 1
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "updateBlogs": 5
    }
}
/**
 * 说明：
 * 此处 return 值 data.updateBlogs 为受影响数据条数
 */
~~~

[返回导航↑](#nav)

<div id="operate-increase" style="width:100%;height:1px;border:none;"></div>

### 3、increase - 原子自增

对某个字段进行加法运算后更新，固然可以采用先查询再运算然后更新的方式，然而这种方式很容易带来数据脏读写的问题，所以我们提供了原子更新操作的能力。

Request:
~~~
{
    commands: [
        {
            name: 'fakeNumbers',
            type: 'increase',       // 指明是 increase 原子自增操作
            target: 'Blog',
            query: {
                where: {
                    userId: 1,
                }
            },
            data: {
                hearts: 10,
                views: 100
            }
        }
    ]
}
/**
 * 这里我们为 id 为 1 的用户博文都增加一些虚假数据
 * 要更新的字段及增量在 data 中指定
 * 可以同时更新多个值，但是增加数字不能为负数
 */
~~~

等效 SQL:
~~~
update `Blog` 
set 
    `hearts` = `hearts` + 10, 
    `views` = `views` + 100 
where 
    (`userId` = 1)
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "fakeNumbers": 2
    }
}
/**
 * 说明：
 * 此处 return 值为受影响数据条数
 */
~~~

<div id="operate-decrease" style="width:100%;height:1px;border:none;"></div>

### 4、decrease - 原子自减

除了将 type 的值由 `increase` 改为 `decrease` 之外，其余代码与 increase 示例别无二致，这里不再赘述。

[返回导航↑](#nav)


<div style="width:100%;height:20px;border:none;"></div>
<div id="logic" style="width:100%;height:1px;border:none;"></div>

# 逻辑能力

如果 JBDAP 只能处理前面讲到的那些基本操作，虽然已经可以节约编写大量实体类代码的工作量，但是对于处理一定程度的复杂逻辑还是远远不够的，也无法帮助前后端开发进行更好的解耦，所以下边我们进入到 JBDAP 的精华部分 —— 逻辑能力。

这里的逻辑能力指的是通过 json 配置来自动调度后台进行数据的流程化处理，毫不客气的说，现实开发中遇到的绝大多数逻辑都可以用 JBDAP 实现，不信就接着往下看。

<div id="logic-expression" style="width:100%;height:1px;border:none;"></div>

## **expression - 通过表达式实现特定值的输入**

要实现基于配置的逻辑调度能力，`expression` 就是一个前提性的工具，其实我们在前面的例子当中已经用到了表达式，只是没有给它明确的称呼而已，现在来回顾一下 `级联查询` 的指令内容。

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
            fields: [
                '*',
                {
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id' // 就是这里啦
                        },
                        order: 'updatedAt#desc'
                    }
                }
            ]
        }
    ]
}
~~~

我们在 `top5blogs` 级联指令的 `query.where` 中指定了 `userId: '$.id'`，这里的 `'$.id'` 其实就是一个表达式，`'$'` 代表着这个查询的父对象也就是 `userInfo` 查出的结果，`'$.id'` 代表着父对象的 id，也就是说我们在查询条件中去比对的这个值不是基于字面量设定的，而是依赖于服务端的运行结果实时运算出来的，所以说它是一个表达式。

上面的用法只是 JBDAP 表达式其中的一种，下面我来列举一下全部的 expression 用法：

- `'$'` 代表子查询所属的父对象
- `'/'` 代表本次请求中全部指令结果集的根目录，自然地 `'/myProfile'` 就代表 name 为 `myProfile` 这个指令的查询结果
- `'.$.'` 是一个特殊用法，它有点像 `values` 查询中的 `pick`，意思是把一个数组中每个元素的指定属性取出来组成一个新的数组并去重，比如 `'/blogList.$.id'` 就意味着取出 blogList 指令中的所有 id
- `'{NotExist}'` 是个常量，当一个多层级表达式中的值不存在时返回
- `'JBDAP.fn.***()'` 或者 `'JBDAP.mysql.***()'` 是预设的内置函数，`JBDAP.fn.***` 代表不区分数据库通用的，`JBDAP.mysql.***` 代表 mysql 数据库专用的，共有以下几种情况：
  - `'JBDAP.mysql.now()'` 以 `'YYYY-MM-DD HH:mm:ss'` 格式返回当前时间
  - `'JBDAP.fn.timestamp()'` 以 new Date().getTime() 格式返回当前时间戳
  - `'JBDAP.fn.plusInt(a,b)'` 对两个 integer 值进行加法运算，注意参数 a 或者 b 可以是一个表达式，比如插入排序数据时可以用 `'JBDAP.fn.plusInt(/stat.maxSeq,1)'` 来生成一个新的排序值，下面几个也同理
  - `'JBDAP.fn.plusFloat(a,b)'` 对两个 float 值进行加法运算
  - `'JBDAP.fn.minusInt(a,b)'` 对两个 integer 值进行减法运算
  - `'JBDAP.fn.minusFloat(a,b)'` 对两个 float 值进行减法运算

现在我们构造一个新的请求，尽量把上面提到的集中 expression 都用上，需求是这样的：

Request：
~~~
{
    commands: [
        // 查出类目的最大 id 和排序号
        {
            name: 'categoryStat',
            type: 'values',
            target: 'Category',
            fields: [
                'max#id=>maxId',
                'max#sequence=>maxSeq'
            ]
        },
        // 创建新类目，排序+1
        {
            name: 'newCategory',
            type: 'create',
            target: 'Category',
            data: {
                name: '军事',
                sequence: 'JBDAP.fn.plusInt(/categoryStat.maxSeq,1)'
            }
        },
        // 插入一条新博文，将类目指定为新插入的 '军事' 类目
        {
            name: 'newBlog',
            type: 'create',
            target: 'Blog',
            data: {
                userId: 1,
                categoryId: 'JBDAP.fn.plusInt(/categoryStat.maxId,1)',
                title: 'this is a new blog',
                content: 'JBDAP.fn.timestamp()'
            }
        },
        // 查出用户1的所有 blog 列表
        {
            name: 'userBlogs',
            type: 'list',
            target: 'Blog',
            fields: 'id,title,views,hearts',
            query: {
                where: {
                    userId: 1
                }
            }
        },
        // 查出用户信息及最新 5 条博文、收到的最新 5 条评论
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
            fields: [
                '*',
                {
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id'
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    }
                },
                {
                    name: 'top5comments',
                    type: 'list',
                    target: 'Comment',
                    fields: 'id,fromUserId,content',
                    query: {
                        where: {
                            'blogId#in': '/userBlogs.$.id'
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    }
                }
            ]
        }
    ]
}
~~~

### 我们来看一下这次请求的逻辑：

- 先查出博文类目的最大 id 和排序号备用
- 创建一个 “军事” 新类目，排序号为 A 查出的最大排序号 + 1
- 以用户1的身份插入一条新博文，类目为 B 中创建的新类目，内容为当前时间戳
- 查出用户1的全部博文列表简略信息备用
- 查出用户1的详情信息以及最新 5 条博文和最新 5 条评论

仔细看代码，在这个过程中，我们几乎用上了全部的 expression 规则，而它也描述了足够复杂的操作逻辑，转换成 sql 视角来看一下：

~~~
select max(`id`) as `maxId`, max(`sequence`) as `maxSeq` from `Category`

insert into `Category` (`createdAt`, `name`, `sequence`, `updatedAt`) values ('2020-07-10 18:11:51', '军事', 4, '2020-07-10 18:11:51')

insert into `Blog` (`categoryId`, `content`, `createdAt`, `title`, `updatedAt`, `userId`) values (4, 1594375911323, '2020-07-10 18:11:51', 'this is a new blog', '2020-07-10 18:11:51', 1)

select `id`, `title`, `views`, `hearts` from `Blog` where (`userId` = 1)

select * from `User` where (`id` = 1) limit 1

select * from `Blog` where (`userId` = 1) order by `updatedAt` desc limit 5

select `id`, `fromUserId`, `content` from `Comment` where (`blogId` in (28, 37, 41, 52, 62, 97, 100, 101)) order by `updatedAt` desc limit 5
~~~

最后返回的结果如下：
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "categoryStat": {
            "maxId": 3,
            "maxSeq": 3
        },
        "newCategory": [
            4
        ],
        "newBlog": [
            101
        ],
        "userBlogs": [
            {
                "id": 28,
                "title": "blog28",
                "views": 252,
                "hearts": 51
            },
            ...
        ],
        "userInfo": {
            "id": 1,
            "username": "user1",
            "password": "password1",
            "avatar": null,
            "email": null,
            "gender": "FEMALE",
            "createdAt": "2020-07-10 18:11:51",
            "updatedAt": "2020-07-10 18:11:51",
            "top5blogs": [
                {
                    "id": 28,
                    "userId": 1,
                    "categoryId": 3,
                    "title": "blog28",
                    "keywords": null,
                    "content": "blog content 28 from user 1",
                    "views": 252,
                    "hearts": 51,
                    "createdAt": "2020-07-10 18:11:51",
                    "updatedAt": "2020-07-10 18:11:51"
                },
                ...
            ],
            "top5comments": [
                {
                    "id": 2,
                    "fromUserId": 4,
                    "content": "comment 2 for blog 37"
                },
                ...
            ]
        }
    }
}
~~~

你能想象吗？这一系列骚操作仅仅是通过 json 描述就实现了！

[返回导航↑](#nav)

<div id="logic-onlyIf" style="width:100%;height:1px;border:none;"></div>

## **onlyIf - 前置条件约束**

这是一个常见的逻辑运用，我们进行一系列操作，前面的查询结果决定后续操作的流程分支。

任何一个指令都可以通过 onlyIf 来设置一个或一组执行的前提条件，只有当 onlyIf 运算的返回值为 true 时，指令才会得以执行，否则会返回 null 值。

举个例子：要创建一个新用户，但是我们不知道 username 是否已经存在，如果贸然将用户输入的用户名直接提交到数据库，很有可能会因为用户名冲突而造成直接失败，所以在创建新用户之前我们应当先检查用户名是否存在，只有当用户名不存在的时候才创建新用户，这样就可以精确控制流程了。

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    username: 'user100'     // 用户名查重
                }
            },
            fields: 'id'
        },
        {
            name: 'newUser',
            type: 'create',
            target: 'User',
            onlyIf: {
                '/userInfo#isNull': true    // 以 userInfo 查询结果是 null 为前提
            },
            data: {
                username: 'user100',
                password: 'password111',
                gender: 'female',
            }
        }
    ]
}
/**
 * 说明：
 * onlyIf 与 query.where 的定义方式和运算规则基本一致，支持分组运算，但是也有小的区别如下：
 * 1、where 其下每一个键值对叫做一个查询条件，其键名中 # 的左边只能是 field 名称
 * 2、onlyIf 其下的每一个键值对则叫做一个比较表达式，其键名中 # 的左边可以是表达式
 * 3、两者运算符也有不同
 *    没有 like 和 notLike
 *    没有 between 和 notBetween
 *    新增 matches 和 doesNotMatch
 *    新增 exists 和 doesNotExist
 *    新增 isUndefined 和 isNotUndefined
 *    新增 isEmpty 和 isNotEmpty
 */
~~~

等效 SQL:
~~~
select `id` from `User` where (`username` = 'user100')
insert into `User` 
    (`createdAt`, `gender`, `password`, `updatedAt`, `username`) 
values 
    ('2019-03-11 13:31:25', 'female', 'password111', '2019-03-11 13:31:25.', 'user100')
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": null,
        "newUser": [
            11
        ]
    }
}
/**
 * 注意：
 * 这是没有用户名冲突执行成功的结果，如果存在冲突的话，返回值 newUser 将会是 null
 */
~~~

[返回导航↑](#nav)


<div id="logic-after" style="width:100%;height:1px;border:none;"></div>

## **after - 后续指令操作**

某种程度上来说，`after` 和 `onlyIf` 作用有相似的地方，都是先执行某一个指令之后再执行后面的指令，而且往往第一个指令的执行结果会成为后面指令的条件相关项。after 的执行时间点在填充级联字段之后。

因此上面先查询再创建新用户的例子，我们也可以用 after 来实现，那为什么要这样设计？还是应用场景的需要，一般来说，当前面指令执行后的不同结果会产生后续步骤分叉的时候我们用 onlyIf，如果后面的指令是无论如何都要执行的，此时我们就用 after。

比如我们浏览一篇 Blog 这个动作，需要查询 Blog 信息，同时给 views + 1，这个更新访问量的操作结果我们并不会十分关注，只是告诉服务器执行一下就好了，所以这个场景就非常适合使用 after，请看代码。

Request:
~~~
{
    commands: [
        {
            name: 'blogInfo',
            type: 'entity',
            target: 'Blog',
            query: {
                where: {
                    id: 1
                }
            },
            after: {
                name: 'updateViews',
                type: 'increase',
                target: 'Blog',
                query: {
                    where: {
                        id: 1
                    }
                },
                data: [
                    views: 1
                ]
            }
        }
    ]
}
/**
 * 查询 blog 详情的时候，顺道就把访问量加 1 的工作给做了。
 * 注意：after 可以接受数组参数，也就是说主指令执行完成后可以执行一系列指令
 * 与此同时，在 after 指令里面，您还是可以继续使用 onlyIf 判断可以进一步加强对数据操作流程的掌控，虽然出现这种情况的机会极低
 */
~~~

等效 SQL:
~~~
select * from `Blog` where (`id` = 1) limit 1
update `Blog` set `views` = `views` + 1 where (`id` = 1)
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "blogInfo": {
            "id": 1,
            "userId": 3,
            "categoryId": 2,
            "title": "blog1",
            "keywords": null,
            "content": "blog content 1 from user 3",
            "views": 338,
            "hearts": 42,
            "createdAt": "2020-07-10 18:49:40",
            "updatedAt": "2020-07-10 18:49:40"
        },
        "$after$": {
            "blogInfo": {
                "updateViews": 1
            }
        }
    }
}
/**
 * after 指令的执行结果被放在了 data.$after$ 下面
 * 我们关注的重心依然是 blog 详情本身
 */
~~~

#### 强烈提醒注意！当 after 指令中存在 create, update, delete, increase, decrease 等非查询指令时（很多时候都是这样的），你应该开启事务支持，这样才能保证数据的一致性，如何开启事务请参见下文。

[返回导航↑](#nav)

<div id="logic-reference" style="width:100%;height:1px;border:none;"></div>

## **reference - 指令间的结果集引用**

reference 指的是在一次查询中包含多条指令时，我们可以在指令之间共享它们的结果集数据，借此来实现一定的复杂逻辑调度。

其实前面 expression 规则章节我们已经用到了 reference，凡是含有 `'$'` 或者 `'/'` 的表达式都是一种引用。 区别在于，含有 `'$'` 的表达式引用的是自身父对象数据，主要用于级联查询，而含有 `'/'` 的表达式引用的是其它数据集。

在这里我们主要对 `'/'` 的使用方法进行说明，其引用包含两种情况：

<div id="logic-reference-as-condition" style="width:100%;height:1px;border:none;"></div>

### 1、引用数据参与条件比对

如果我想要查出 id 为 1 的用户所收到的最新 10 条评论，怎么做呢？由于 Comment 表与 User 表之间并没有直接的关联，它们的关系要通过 Blog 建立起来，而最新 10 条评价可能出现在任意一篇 Blog 中，此时你总不能级联查出该用户所有的 Blog，然后再为每篇 Blog 级联查出所有的评论，最后一股脑全丢给前端去排序处理吧？理论上行得通，现实中不可行，一来服务器压力高，二来网络传输量大。

所以我们要换个思路：

- 首先查出该用户所有 Blog 的 id 集合，我们这里把它叫做 ids
- 然后以 { 'blogId#in': ids } 为 where 条件对 Comment 进行查询
- 按照 id 倒序取前 10 条即可

显然这是个更理想的选择，核心问题就在于如何实现对这个 ids 的查询、保存和引用，看代码：

Request:
~~~
{
    commands: [
        {
            name: 'userBlogs',      // 这个指令的查询结果将被引用
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        {
            name: 'top10comments',
            type: 'list',
            target: 'Comment',
            query: {
                where: {
                    'id#in': '/userBlogs.ids'   // 引用 userBlogs 查询结果中的 ids 属性作为条件进行查询
                },
                order: 'id#desc',       // 倒序取最新
                size: 10                // 取前 10 条
            }
        }
    ]
}
/**
 * 说明：
 * 我们通过多指令的方式来实现，首先对即将被引用的 userBlogs 指令进行查询
 * 然后在 top10comments 的查询条件中通过 /userBlogs.ids 的方式获得对该数值的引用以实现查询
 */
~~~

等效 SQL:
~~~
select * from `Blog` where (`userId` = 1)

select * 
from `Comment` 
where 
    (`id` in (59, 65, 76)) 
order by `id` desc 
limit 10
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userBlogs": {
            "ids": [
                59,
                65,
                76
            ]
        },
        "top10comments": [
            {
                "id": 76,
                "blogId": 81,
                "fromUserId": 10,
                "replyTo": null,
                "content": "comment 76 for blog 81",
                "hearts": 96,
                "createdAt": "2020-07-10 19:10:20",
                "updatedAt": "2020-07-10 19:10:20"
            },
            ...
        ]
    }
}
/**
 * 结果与预期完全一致
 */
~~~

[返回导航↑](#nav)

<div id="logic-reference-as-source" style="width:100%;height:1px;border:none;"></div>

### 2、将引用数据作为数据源进行查询

上一个例子我们成功通过引用的方式实现了一个不是那么直观的查询，但其实引用还有一个减少冗余 sql 查询的作用。

现在我们填一个前边留下的坑，级联查询性能低下的那个例子。

假设我们想要查出最新的 10 篇 Blog，同时要求级联填充每一篇 Blog 的 Category。直接用级联填充的话是这样子的。

Request:
~~~
{
    commands: [
        {
            name: 'top10blogs',
            type: 'list',
            target: 'Blog',
            query: {
                order: 'id#desc',
                size: 10
            },
            fields: [
                '*',
                {
                    name: 'category',
                    type: 'entity',
                    target: 'Category',
                    query: {
                        where: {
                            id: '$.categoryId'
                        }
                    }
                }
            ]
        }
    ]
}
~~~

等效 SQL:
~~~
select * from `Blog` order by `id` desc limit 10
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 3)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 3)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 2)
select * from `Category` where (`id` = 3)
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "top10blogs": [
            {
                "id": 100,
                "userId": 6,
                "categoryId": 2,
                "title": "blog100",
                "keywords": null,
                "content": "blog content 100 from user 6",
                "views": 144,
                "hearts": 28,
                "createdAt": "2019-02-28 13:27:05",
                "updatedAt": "2019-02-28 13:27:05",
                "category": {
                    "id": 2,
                    "sequence": 1,
                    "name": "政治",
                    "createdAt": "2019-02-28 13:27:05",
                    "updatedAt": "2019-02-28 13:27:05"
                }
            },
            ...
        ]
    }
}
~~~

无论是查询的定义还是返回结果，都是 “看起来” 没有问题，然而仔细看一下 sql 语句，你会发现有太多的重复查询，这 10 篇 Blog 的 CategoryId 不是 2 就是 3，然而我们却分别重复查了 7 次和 3 次，整个任务竟然执行了 11 条 SQL 语句，这种性能上的损耗是完全不可接受的。

怎么用引用查询结果的方式来解决这个问题呢？聪明的你也许已经想到了，我们可以先查出全部的 Category，然后查出最新的 10 篇 Blog，接着通过级联查询为每条 Blog 数据填充相应的 Category 信息。

思路是对的，我的方式可能更加巧妙，因为我同时使用 `values` 查询的 `pick` 和 `clone`，妙处请自己体会。

Request:
~~~
{
    commands: [
        {
            name: 'blogs',
            type: 'values',
            target: 'Blog',
            query: {
                order: 'id#desc',
                size: 10
            },
            fields: [
                'pick#categoryId=>categoryIds',     // 取出 categoryIds
                'clone#*=>list'                     // 拷贝数据到 list
            ]
        },
        {
            name: 'categories',
            type: 'list',
            target: 'Category',
            query: {
                where: {
                    'id#in': '/blogs.categoryIds'   // 查询有必要的数据
                }
            }
        },
        {
            name: 'top10blogs',
            type: 'list',
            target: '/blogs.list',                  // 引用 /blogs.list 作为数据源
            fields: [
                '*',
                {
                    name: 'category',
                    type: 'entity',
                    target: '/categories',          // 引用 /categories 作为数据源
                    query: {
                        where: {
                            'id': '$.categoryId'    // 从数据源中查询作为级联属性填充
                        }
                    }
                }
            ]
        }
    ]
}
~~~

等效 SQL:
~~~
select * from `Blog` order by `id` desc limit 10
select * from `Category` where (`id` in (2, 3))
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "blogs": {
            "categoryIds": [
                1,
                2,
                3
            ],
            "list": [
                {
                    "id": 100,
                    "userId": 8,
                    "categoryId": 1,
                    "title": "blog100",
                    "keywords": null,
                    "content": "blog content 100 from user 8",
                    "views": 50,
                    "hearts": 59,
                    "createdAt": "2020-07-10 19:18:45",
                    "updatedAt": "2020-07-10 19:18:45"
                },
                ...
            ]
        },
        "categories": [
            {
                "id": 1,
                "name": "政治",
                "sequence": 1,
                "createdAt": "2020-07-10 19:18:45",
                "updatedAt": "2020-07-10 19:18:45"
            },
            ...
        ],
        "top10blogs": [
            {
                "id": 100,
                "userId": 8,
                "categoryId": 1,
                "title": "blog100",
                "keywords": null,
                "content": "blog content 100 from user 8",
                "views": 50,
                "hearts": 59,
                "createdAt": "2020-07-10 19:18:45",
                "updatedAt": "2020-07-10 19:18:45",
                "category": {
                    "id": 1,
                    "name": "政治",
                    "sequence": 1,
                    "createdAt": "2020-07-10 19:18:45",
                    "updatedAt": "2020-07-10 19:18:45"
                }
            },
            ...
        ]
    }
}
~~~

这种方式执行的 SQL 语句就只有两条了，结果是一样的结果，然而过程和性能却大相径庭。

[返回导航↑](#nav)

<div id="logic-visibility" style="width:100%;height:1px;border:none;"></div>

## **visibility - 指令结果可见性**

上面两个 reference 的例子有一点令人不爽的地方就是我们的所有指令结果集都给返回到前端了，但其实有许多指令结果只是过程产物，无需让前端知道，怎么办呢？我们只需一个配置，如下例：

Request:
~~~
{
    commands: [
        {
            return: false,          // renturn 设为 false，此查询结果将不返回
            name: 'userBlogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 1
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        ...
    ]
}
~~~

只需给不需返回的指令设置这么一个属性，返回结果立刻清爽了，是不是很简单 :-）

[返回导航↑](#nav)

<div id="logic-transaction" style="width:100%;height:1px;border:none;"></div>

## **transaction - 事务支持**

终于还是来到了这个只要是数据库就绕不开的 G 点，不管你使用什么开发环境或者 ORM 框架，在编码中按需使用事务一般来说还是比较费事的，而且事务的使用只能由后端决定，然而有了 JBDAP 就不一样了，这个能力可以非常容易的开放给前端。

我们现在构造一个需求场景：某个用户想要清空他的全部博文，该怎么操作？

提醒一点，由于数据库为评论和博文创建了外键，Comment 是左表，Blog 是右表（[详情点这里查看数据结构](#schema)），因此如果要删除 Blog 就必须先把它对应的 Comment 先删掉，于是乎我们这里出现了一个完美的 transaction 应用场景。

不急，你可以先自己设想一下如何写 json 来表达这一逻辑，然后再跟我的代码做一下对照。

下面上代码：
~~~
{
    isTransaction: true,        // 注意这里，我们把 isTransaction 配置为 true
    commands: [
        // 查出用户8的全部博文id列表
        {
            return: false,
            name: 'blogs',
            type: 'values',
            target: 'Blog',
            query: {
                where: {
                    userId: 8
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        // 根据博文列表查出全部评论的id列表
        {
            return: false,
            name: 'comments',
            type: 'values',
            target: 'Comment',
            query: {
                where: {
                    'blogId#in': '/blogs.ids'
                }
            },
            fields: [
                'pick#id=>ids'
            ]
        },
        // 根据评论id列表删除评论
        {
            name: 'delComments',
            type: 'delete',
            target: 'Comment',
            query: {
                where: {
                    'id#in': '/comments.ids'
                }
            }
        },
        // 根据id列表删除博文
        {
            name: 'delBlogs',
            type: 'delete',
            target: 'Blog',
            query: {
                where: {
                    userId: 8
                }
            }
        },
    ]
}
~~~

Response：
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "delComments": 74,
        "delBlogs": 13
    }
}
~~~

可以看到，开启事务支持是多么的容易，只要增加一个 commands 属性同级别的 `'isTransaction: true'` 就 ok 了。

不过还是要重申一下事务的使用场景：

- 在一个任务中存在多个非查询指令，则必须使用事务
- 如果存在多个操作指令，其中有 1 个是非查询指令，则建议开启事务
- 存在多个操作指令，只有最后 1 个操作是非查询指令，此时可以不开启事务

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="assistant" style="width:100%;height:1px;border:none;"></div>

# 开发辅助

为了方便开发者进行调试和排错，我们还提供了更多的辅助功能，相信可以大大提升您的开发效率

<div id="assistant-auto-timestamp" style="width:100%;height:1px;border:none;"></div>

## **自动填充时间戳**

由于 jbdap-mysql 在某种程度上起到了 ORM 的作用，所以我们在实践中遵循了这样的原则：

- 每个数据表都必须有 `createdAt` 和 `updatedAt` 两个 datetime 类型的字段
- 执行 `create` 指令时，如果前端没有指定  `createdAt` 和 `updatedAt` 两个字段值，框架会自动给数据添加上，值设为执行时的当前时间
- 执行 `update` 指令时，如果前端没有指定 `updatedAt` 这个字段值，框架会自动给数据添加上，值设为执行时的当前时间
- 请注意，执行 `increase|decrease` 并不会自动更新时间戳

换言之，开发人员在开发过程中完全可以不必关注这两个字段的填充和更新问题，jbdap-mysql 会为您完成这一繁琐又烦人的任务。

当然，如果你实在不需要这两个时间戳字段，你也可以手动关闭此功能，通过给 `JBDAP.manipulate` 的  `config` 参数增加一个属性 `'autoTimestamp: false'` 即可，如下：

~~~
// 参数配置
let config = {
    language: 'zh-cn',
    printSql: true,
    autoTimestamp: false
}
// 执行查询
JBDAP.manipulate(conn,json,config)
~~~

[返回导航↑](#nav)

<div id="assistant-logs" style="width:100%;height:1px;border:none;"></div>

## **日志输出 - 前端可以查看执行过程**

如果你希望知道指令在服务端的运行是否如自己预期，可以将 needLogs 配置为 true

Request:
~~~
{
    needLogs: true,     // 告知服务器需要返回执行日志
    commands: [
        {
            name: 'userInfo',
            type: 'entity',
            target: 'User',
            query: {
                where: {
                    id: 1
                }
            },
            fields: [
                '*',
                {
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id'
                        },
                        order: 'updatedAt#desc',
                        size: 5
                    }
                }
            ]
        }
    ]
}
~~~

Response:
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "userInfo": {
            ...
        }
    },
    "logs": [
        "- 开启 JBDAP 任务",
        "- 检查接收到的 JSON 是否合法",
        "* 识别用户身份",
        "- 开始处理接收到的指令",
        "- 非事务方式执行",
        "$ 开始执行顶层命令 /userInfo [entity 类型]",
        "  $ 开始填充级联字段 [top5blogs]",
        "  $ 级联字段 [top5blogs] 填充完毕",
        "$ 顶层命令 /userInfo 执行完毕",
        "- 全部指令处理完成",
        "- JBDAP 任务成功"
    ]
}
~~~

你会看到返回数据里面多了一个 logs 属性，这个数组内容展示了你提交的 Request 代码到达服务端后发生了什么，是不是很酷？

[返回导航↑](#nav)

<div id="assistant-trace" style="width:100%;height:1px;border:none;"></div>

## **错误跟踪 - 前端可以查看错误跟踪**

当你的调用出错时，层层递进的错误提示信息会出现在 message 字段中，基本上你仅凭这些信息已经足以找到问题所在，比如这个：

Request：
~~~
{
    commands: [
        {
            name: 'insertSingle',
            type: 'create',
            target: 'Category',
            data: {
                name: '政治',
                sequence: 1,
            },
        },
    ]
}
~~~
Response:
~~~
{
    "code": 500,
    "message": "[CommandsExecError]: 解析或执行指令失败 <= [CommandHandlerError]: 处理指令 'insertSingle' 出错 <= [DBExecError]: 操作数据出错 <= [ER_DUP_ENTRY]: Duplicate entry '政治' for key 'category_name_unique'",
    "data": null
}
~~~

把 message 单独拿出来整理一下格式是这样的

~~~
[CommandsExecError]: 解析或执行指令失败 
    <= [CommandHandlerError]: 处理指令 'insertSingle' 出错 
    <= [DBExecError]: 操作数据出错 
    <= [ER_DUP_ENTRY]: Duplicate entry '政治' for key 'category_name_unique'
~~~

这样就可以一目了然，因为你提交的 category.name 是个 unique 字段，而新提交的数据 `“政治”` 跟已有数据发生了冲突。

如果你还想看到服务端的错误堆栈信息，给请求的 json 添加一个 `needTrace: true` 属性即可。

Request：
~~~
{
    needTrace: true,
    commands: [
        {
            name: 'insertSingle',
            type: 'create',
            target: 'Category',
            data: {
                name: '政治',
                sequence: 1,
            },
        },
    ]
}
~~~
Response:
~~~
{
    "code": 500,
    "message": "[CommandsExecError]: 解析或执行指令失败 <= [CommandHandlerError]: 处理指令 'insertSingle' 出错 <= [DBExecError]: 操作数据出错 <= [ER_DUP_ENTRY]: Duplicate entry '政治' for key 'category_name_unique'",
    "data": null,
    "trace": "Error\n    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)\n    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)\n    at Object.JS.throwError (/src/global.js:32:8)\n    at proceed (/lib/JBDAP.js:231:10)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nCaused by Error\n    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)\n    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)\n    at Object.JS.throwError (/src/global.js:32:8)\n    at handleCmd (/lib/JBDAP.js:345:8)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nCaused by Error\n    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)\n    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)\n    at Object.JS.throwError (/src/global.js:32:8)\n    at executeCmd (/lib/JBDAP.js:1142:8)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nCaused by [ER_DUP_ENTRY]: Duplicate entry '政治' for key 'category_name_unique' insert into `Category` (`createdAt`, `name`, `sequence`, `updatedAt`) values ('2020-07-11 11:58:54', '政治', 1, '2020-07-11 11:58:54') - Duplicate entry '政治' for key 'category_name_unique'\n    at Packet.asError (/node_modules/mysql2/lib/packets/packet.js:712:17)\n    at Query.execute (/node_modules/mysql2/lib/commands/command.js:28:26)\n    at Connection.handlePacket (/node_modules/mysql2/lib/connection.js:417:32)\n    at PacketParser.Connection.packetParser.p [as onPacket] (/node_modules/mysql2/lib/connection.js:75:12)\n    at PacketParser.executeStart (/node_modules/mysql2/lib/packet_parser.js:75:16)\n    at Socket.Connection.stream.on.data (/node_modules/mysql2/lib/connection.js:82:25)\n    at Socket.emit (events.js:198:13)\n    at addChunk (_stream_readable.js:288:12)\n    at readableAddChunk (_stream_readable.js:269:11)\n    at Socket.Readable.push (_stream_readable.js:224:10)"
}
~~~
多出来的那一大坨 `trace` 就是服务端发生的错误跟踪，我们将内容格式加以整理：
~~~
Error
    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)
    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)
    at Object.JS.throwError (/src/global.js:32:8)
    at proceed (/lib/JBDAP.js:231:10)
    at process._tickCallback (internal/process/next_tick.js:68:7)
Caused by Error
    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)
    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)
    at Object.JS.throwError (/src/global.js:32:8)
    at handleCmd (/lib/JBDAP.js:345:8)
    at process._tickCallback (internal/process/next_tick.js:68:7)
Caused by Error
    at Object.JS.newErrorI18N (/node_modules/jbdap-global/lib/global.js:33:10)
    at Object.JS.throwErrorI18N (/node_modules/jbdap-global/lib/global.js:41:12)
    at Object.JS.throwError (/src/global.js:32:8)
    at executeCmd (/lib/JBDAP.js:1142:8)
    at process._tickCallback (internal/process/next_tick.js:68:7)
Caused by [ER_DUP_ENTRY]: Duplicate entry '政治' for key 'category_name_unique' insert into `Category` (`createdAt`, `name`, `sequence`, `updatedAt`) values ('2020-07-11 11:58:54', '政治', 1, '2020-07-11 11:58:54') - Duplicate entry '政治' for key 'category_name_unique'
    at Packet.asError (/node_modules/mysql2/lib/packets/packet.js:712:17)
    at Query.execute (/node_modules/mysql2/lib/commands/command.js:28:26)
    at Connection.handlePacket (/node_modules/mysql2/lib/connection.js:417:32)
    at PacketParser.Connection.packetParser.p [as onPacket] (/node_modules/mysql2/lib/connection.js:75:12)
    at PacketParser.executeStart (/node_modules/mysql2/lib/packet_parser.js:75:16)
    at Socket.Connection.stream.on.data (/node_modules/mysql2/lib/connection.js:82:25)
    at Socket.emit (events.js:198:13)
    at addChunk (_stream_readable.js:288:12)
    at readableAddChunk (_stream_readable.js:269:11)
    at Socket.Readable.push (_stream_readable.js:224:10)
~~~

也是很容易定位到错误所在的。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="advance" style="width:100%;height:1px;border:none;"></div>

# 高级能力

到目前为止，JBDAP 的强大和灵活已经锋芒毕露，可以说日常开发中绝大部分的需求都能够得到满足，用于建设一套内部应用接口已经足够。

然而我们并没有止步于此，这一章节我们会让你看到一个优秀的应用程序的更高追求。

<div id="advance-decorator" style="width:100%;height:1px;border:none;"></div>

## **decorator - 数据预处理**

前面章节我们已经可以实现用 json 调度执行比较复杂的数据库操作逻辑，然而总还是会有一些比较特殊的需求无法在前端实现，比如用户注册时我们传给后端一个密码，而这个密码需要加密然后再把密文入库，这种情况我们当然不可能把加密方法写在前端，此时我们就可以用到 `decorator - 数据预处理` 这一功能了。

> 在此之前的所有实例都是只通过 `json` 的配置就可以达到目的，从现在开始，我们需要通过类似 `插件` 的模式来实现更多高级玩法。

先回顾一下 [README.md](https://github.com/JBDAP/JBDAP-Node-Mysql/blob/master/README.md) 里面关于 jbdap-mysql 包的初始化代码：

~~~
// 引用
const JBDAP = require('jbdap-mysql')

// 创建连接
const conn = JBDAP.getConn({
    host: 'localhost',
    user: 'root',
    pass: '***********',
    dbName: 'jbdap_test'
})

// 参数配置
let config = {
    language: 'zh-cn',  // 以简体中文作为交流语言
    printSql: true,     // 是否打印 sql 语句（方便调试，生产环境可关闭）
}

// JBDAP指令描述
let json = {
    ...
}

// 执行查询
JBDAP.manipulate(conn,json,config)
    .then((res)=>{
        console.log(JSON.stringify(res,null,4))
    })
    .catch((err)=>{
        console.log(err)
    })
~~~

怎么实现 decorator 呢？下面我们对 `config 参数配置` 部分进行修改

~~~
// 定义一个 decorator 数据预处理函数
/**
 * 数据预处理函数
 * @param {object} cmd 当前指令
 * @param {object} row 要处理的数据行
 * @param {string} lang 系统提示语言
 */
async function decorator(cmd,row,lang) {
    // 如果是注册新用户，那么把密码加密后再入库
    if (cmd.target === 'User' && cmd.type === 'create') {
        // 执行加密
        row.password = encryptPass(row.password)
        // 返回数据
        return row
    }
}

// 将预处理函数作为参数加入 config 参数配置
let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
}
~~~

这样我就们实现了预期目标。

再举一个例子来说明 `decorator` 的用途，我们当前的实例数据库设计时采用了自增字段 id 作为数据表的主键，所以我们可以通过 id 来进行时间排序，然而对于大型应用系统来讲，自增字段是有缺点的，比如：

- 自增字段容量有限
- 自增字段容易被别人猜测到业务量或者爬取数据
- 自增字段在分布式数据库架构中无法解决排序问题

所以就有了 UUID 这种主键类型，假如我们采用 UUID 做主键，固然解决了数据容量、防爬取的问题，然而它又不能作为排序依据，当然我们也可以用 `createdAt` 字段来排序，但是数据量很大的时候，datetime 字段排序的性能也是个问题，此时我们可以采取 UUID + Bigint 两个字段组合的方式来解决问题，UUID 做主键，同时新增一个 `'CTS'`（Creation TimeStamp） 字段专门用来做排序（有时候还要加一个 `'UTS'` 更新时间戳），此时就有了一个小麻烦，那就是每次插入数据时都要带上 CTS/UTS 的值，非常烦人也很容易忘掉，而且传到后端后它的值与真实的执行时间还不相同，此时我们可以通过 decorator 来实现自动填充字段：

~~~
async function decorator(cmd,row,lang) {
    // 以下表格需要自动添加时间戳
    let tables = [
        'User',
        'Blog',
        'Comment'
    ]
    if (tables.indexOf(cmd.target) >= 0) {
        if (cmd.type === 'create') {
            let ts = new Date().getTime()
            row.CTS = ts
            row.UTS = ts
        }
        if (cmd.type === 'update') row.UTS = new Date().getTime()
    }
    // 返回数据
    return row
}

~~~

搞定！

[返回导航↑](#nav)

<div id="advance-server-function" style="width:100%;height:1px;border:none;"></div>

## **服务端函数 - 个性化逻辑处理**

到目前为止，JBDAP 已经做得很棒，但总还是会有一些用 JBDAP 还无法直接实现（尤其是涉及到与第三方应用交互的部分）或者说实现起来非常啰嗦的需求。

诚然，JBDAP 的核心价值是致力于解决 80% 甚至 90% 以上的常规数据库开发问题，但我们并没有放弃剩余的那极少数需求，通过引入 `服务端函数` 类型的指令，我们可以做到让开发者将任意开发需求接入到 JBDAP 的体系内，下面还是用实际例子来说明问题。

例如最常见的 `"重置密码"` 功能，（用户身份已经通过验证），下面需要将用户密码重设为随机字符串，然后将新密码发送到用户的关联邮箱。这个需求怎么处理？

下面我们还是要对 `config 参数配置` 部分进行修改

~~~
// 定义一个 dispatcher 调度器函数
/**
 * 调用服务端函数
 * @param {object} user 用户身份
 * @param {object} conn 当前 knex 数据库连接
 * @param {string} name 服务端函数名称
 * @param {array|object} data 传递来的数据
 * @param {string} lang 系统提示语言
 */
async function dispatcher(user,conn,name,data,lang) {
    // 服务端函数名
    console.log('server-side function name:',name)
    // 接收到的数据
    console.log('data:',JSON.stringify(data,null,4))
    // 其余参数暂时先不用关注
    // 根据函数名执行操作
    switch (name) {
        case 'reset_user_pass': {
            // 生成一个随机字符串做密码
            let newPass = randomStr(8)
            // 修改密码，注意 conn 参数是当前 knex 数据库连接实例，可以直接拿来使用
            await conn('User').where('id','=',data.userId).update({ password: md5(newPass) })
            // 下面是发送邮件的代码
            await sendMail(...)
            // 返回函数执行结果，此结果会返回给前端
            return 'success'
        }
    }
    return 'ok'
}

// 将调度器作为参数加入 config 参数配置
let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
    dispatcher,
}
~~~

这样一个简化版的服务端函数调度器就实现了，这里仅用来演示整个流程，你可以尝试进一步完善它的功能。

然后是请求指令：
~~~
let json = {
    commands: [
        {
            name: 'resetUserPass',
            type: 'function',           // 将 type 设为 'function' 即可
            target: 'reset_user_pass',  // target 就是你要调用的服务端函数明
            data: {                     // data 是你要传给服务器的参数
                userId: 1
            }
        }
    ]
}
~~~

调用执行后，服务端打印出如下内容：
~~~
server-side function name: reset_user_pass
data: {
    "userId": 1
}
// 可见服务端函数的信息已经被成功接收
~~~

再看执行结果：
~~~
{
    "code": 200,
    "message": "ok",
    "data": {
        "resetUserPass": "success"
    }
}
~~~

函数已经被成功执行！

放飞一下你的想象力，是不是通过这一模式几乎可以实现所有需求？比如用来做服务端代理解决请求跨域问题，比如读取 Redis 服务器缓存，比如发送内容到日志系统...

也就是说，以后再出现非常特殊的操作逻辑，我们只需要扩充 `dispatcher 函数` 的内容就可以了，当然服务端函数的名称和参数如何定义，这就免不了前后端进行协商确定，但不管怎么说，开发模式都会被极大地简化。

[返回导航↑](#nav)

<div id="advance-cache" style="width:100%;height:1px;border:none;"></div>

## **缓存支持 - 有助于提升查询性能**

刚才提到了缓存，一个高性能、高并发的数据库系统当然离不开缓存这一利器，JBDAP 也提供了对缓存的支持，而且使用非常方便。

实现方式跟服务端函数类似，也是先实现一个 cacher 缓存存取器函数，然后加入到 config 参数

~~~
// 实现一个缓存存取器 cacher
// 这里我用一个简单的本机内存缓存来演示代码框架
/**
 * 自己实现的缓存读写功能
 * @param {string} action 即 get 还是 set 或者 clear
 * @param {cmd} cmd 原始 JBDAP 指令
 * @param {array} data 要写入缓存的数据
 */
async function cacher(action,cmd,data) {
    if (global.$JBDAP_CACHE$ === undefined) global.$JBDAP_CACHE$ = {}
    let cache = global.$JBDAP_CACHE$
    // 每个表有一个独立的缓存空间
    if (cache[cmd.target] === undefined) cache[cmd.target] = {}
    let c = cache[cmd.target]
    // 必须实现以下三个 action 操作
    switch (action) {
        // 读取缓存
        case 'get': {
            // 忽略带有 after 属性的查询
            if (cmd.after) return null
            // 将 cmd 序列化后进行 md5 然后加上 cmd.type 做前缀生成 key
            let key = `${cmd.type}-${hash.md5(JSON.stringify(cmd))}`
            // 读取缓存
            let res = c[key]
            if (res !== undefined) {
                console.log('缓存命中 - ' + key)
                return res
            }
            else return null
        }
        // 写入缓存
        case 'set': {
            // 生成 key
            let key = `${cmd.type}-${hash.md5(JSON.stringify(cmd))}`
            // 写入缓存
            c[key] = data
            console.log('写入缓存 - ' + key)
            return
        }
        // 清理缓存
        case 'clear': {
            // 当 cmd.type 是 create 或者 update 的时候，缓存清理逻辑比较复杂
            // 所以这里干脆直接把该表的全部缓存都清掉
            c = {}
            console.log('清空数据表 [' + cmd.target + '] 的缓存')
        }
    }
}

// 将缓存存取器作为参数加入 config 参数配置
let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
    dispatcher,
    cacher,
}
~~~

然后再去执行多个重复查询 json 试一下，就能看到服务端打印出的缓存模块的工作痕迹。

当然这个例子中的缓存控制还是非常粗糙的，相信你可以根据自己的缓存系统特点写出更优秀的缓存存取器。

[返回导航↑](#nav)

<div id="advance-security" style="width:100%;height:1px;border:none;"></div>

## **安全性 - 应用程序的命脉**

可能细心的小伙伴已经发现，在前面的例子中，我们天马行空的演示了各种骚操作，唯独没有提到安全性相关的话题，如果 JBDAP 提供的数据访问接口可以被无差别的调用，那么岂不是意味着它只能作为系统内部接口来发挥作用？当然不是这样，JBDAP 致力于打破前后端之间的壁垒，让数据交互不再那么难缠，自然一定会提供安全控制的能力，否则它的存在意义就会非常有限。

在安全性方面，我们通过以下三个互相作用的模块来实现：

<div id="advance-recognizer" style="width:100%;height:1px;border:none;"></div>

### 1、身份校验

实现安全控制的第一步是身份识别，也就是知道请求者是谁，他是什么角色，有什么权限。

跟上面一样，我们先来实现一个身份识别函数，它接收一个输入参数，返回用户身份信息：

~~~
/**
 * 获取用户信息并返回
 * @param {object} security 鉴权相关数据对象
 */
async function recognizer(security) {
    // security 是安全性相关数据的容器
    // verifyToken 通过对 token 进行校验来获得用户身份信息
    let result = await verifyToken(security.token)
    // 将得到的用户信息传回
    return result
    // 例如 result 结构可能是这样的：
    //{
    //    role: 'author',
    //    userId: 1,
    //    name: 'user1',
    //    permission: {
    //        ...
    //    }
    //}
}

let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
    dispatcher,
    cacher,
    recognizer,
}
~~~

在发送请求时，添加 security 内容，这样 `recognizer` 就可以通过它来获得用户身份信息了。这一身份信息将会贯穿该次请求的始末，其中每一个指令是否有权限去执行，都要通过这一身份信息来判断。

~~~
{
    security: {
        token: '...'
    },
    commands: [
        ...
    ]
}
~~~

我们可以回顾一下前面服务端函数章节提到的 `dispatcher` 调度器，当时我们忽略掉的、也是它接收到的第一个参数就是 `user`，它正是我们在这个 `recognizer` 函数中返回的对象，有了它我们也可以在执行服务端函数的时候精细控制哪些人允许执行哪些函数了。

<div id="advance-doorman" style="width:100%;height:1px;border:none;"></div>

### 2、权限控制

所谓 `权限控制`，无非就是 —— `哪些角色、哪些人有权对哪些表进行哪些操作、处理其中的哪些数据`，为了精细控制权限，我们先实现一个 doorman 函数：

~~~
/**
 * 自己实现的权限控制器，用于检查每一个 JBDAP 指令是否被授权
 * @param {object} user 即 recognizer 获取到的用户信息
 * @param {cmd} cmd 原始 JBDAP 指令
 * @param {array} data 当前操作指令涉及的数据
 */
async function doorman(user,cmd,data) {
    // user 参数就是前边 recognizer 得到的内容
    // 管理员可以进行所有操作
    if (user.role === 'admin') return true
    // 普通用户可以查看所有常规内容
    let commonTables = [
        'User',
        'Category',
        'Blog',
        'Comment'
    ]
    let readOnlyTypes = [
        'list',
        'entity',
        'values'
    ]
    // 注意这里通过 cmd 指令的内容来判断是否符合条件
    if (user.role === 'user' && commonTables.indexOf(cmd.target) >= 0 && readOnlyTypes.indexOf(cmd.type) >= 0) return true
    // 只能操作用户自己的博客数据
    if (user.role === 'user' && cmd.target === 'Blog' && (cmd.type === 'create' || cmd.type === 'update' || cmd.type === 'delete')) {
        let yon = true
        _.each(data, (row) => {
            if (data.userId !== user.id) yon = false
        })
        if (yon) return true
    }
    // 任何人都可以给博客点击数+1
    if (cmd.target === 'Blog' && cmd.type === 'increase' && cmd.data.views === 1) return true
    // 你可以继续写其它规则
    ...
    // 如果前面的规则都不放行，则返回 false
    return false
}

let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
    dispatcher,
    cacher,
    recognizer,
    doorman,
}
~~~

需要注意的是，这个 doorman 函数的编写，思维方式与传统编码思路有些不同，常规模式下我们控制权限是从单个表格出发到角色的2维思路，而这里是从角色出发到表格再到操作类型的3维思路，当然你也可以按照常规思路来书写，只是代码可能会啰嗦一点，但是会更容易理解，这都取决于你自己。总之需要你仔细进行探索，才能避免出现权限漏洞。

[返回导航↑](#nav)

<div id="advance-scanner" style="width:100%;height:1px;border:none;"></div>

### 3、敏感数据屏蔽

前面的权限控制可以帮助我们精确到行的粒度，但是有时候单个数据行里还是有一些字段是不允许前端看到的，比如用户表里的密码字段，哪些数据表里有哪些敏感字段是不能对外展示的，我们必须要进行控制。

照例，我们先编写一个 `scanner` 函数：

~~~
/**
 * 敏感数据扫描器，用于数据返回前检查敏感数据
 * @param {object} user 即 recognizer 获取到的用户信息
 * @param {cmd} cmd 原始 JBDAP 指令
 * @param {array} fields 查询指令解析出的字段数组
 * @param {array} data 要扫描的数据列表
 */
function scanner(user,cmd,fields,data) {
    try {
        // 对数据扫描主要是解决敏感字段问题
        // 对所有人遮盖密码
        if (cmd.target === 'User') {
            if (fields.indexOf('*') >= 0 || fields.indexOf('password') >= 0) {
                for (let i=0; i<data.length; i++) {
                    let row = data[i]
                    if (row.password) row.password = '******'
                }
            }
        }
        // 将脱敏后的数据返回
        return data
    }
    catch (err) {
        // 将错误抛出可以附加到 JBDAP 的完整错误信息链
        throw err
    }
}

let config = {
    language: 'zh-cn',
    printSql: true,
    decorator,
    dispatcher,
    cacher,
    recognizer,
    doorman,
    scanner,
}
~~~

这就是 JBDAP 安全控制 `“三驾马车”` 的最后一位了，至此我们已经实现了 `'表——行——列'` 三个层级的安全性控制，至少目前在我使用了 JBDAP 进行开发的项目里面，还没有出现无法满足的安全控制需求。


> 截止目前，JBDAP 目前具备的全部能力都已经得到展示，好不好用你也应该有了自己的判断，如果有兴趣的话，就赶紧尝试起来吧。


<div style="width:100%;height:20px;border:none;"></div>
<div id="helper" style="width:100%;height:1px;border:none;"></div>

# 数据库管理助手

为了方便开发人员对数据库结构进行管理，jbdap-mysql `“附赠”` 了一个数据库 `helper`，它的核心思想很简单 —— 基于 json 配置来描述数据表结构，让数据库初始化工作可以自动化进行

<div id="helper-create" style="width:100%;height:1px;border:none;"></div>

## **创建数据表**

JBDAP 致力于用 json 来描述数据处理逻辑，同样的思路，数据库模型也可以很容易的用 json 来描述，通常我们把这类描述文件称作 `'model'`，然后通过解析它实现数据库结构的自动创建。

<div id="helper-model" style="width:100%;height:1px;border:none;"></div>

### 1、用 json 描述数据结构

这种方式最大的好处在于语义化程度极高，几乎不用解释就能看懂，下面我直接把我们正在使用的实例数据库 `'Blog'` 表的 model 文件贴上来，相信你一看就懂：

~~~
module.exports = {
    name: 'Blog',                   // 数据表名
    version: '1.0',                 // 版本
    comment: '博客文章',             // 注释
    columns: [                      // 字段定义
        {
            name: 'id',             // 字段名称
            comment: '自增主键',     // 字段注释
            type: 'increments',     // 字段类型
            primary: true,          // 主键标志
            notNullable: true,      // 不可为 Null
        },
        {
            name: 'userId',
            type: 'integer',
            notNullable: true,
            unsigned: true,         // 无符号（正数）
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
            length: 100,            // 字段长度
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
            defaultTo: 0,           // 默认值
        },
        {
            name: 'hearts',
            type: 'integer',
            notNullable: true,
            unsigned: true,
            defaultTo: 0,
        },
    ],
    uniques: [                      // 唯一键
        ['title']                   // 可以是组合键
    ],
    indexes: [                      // 索引
        ['keywords'],               // 同样可以使组合索引
        ['views'],
        ['hearts'],
    ],
    foreignKeys: [                  // 外键
        {
            selfColumn: 'userId',   // 左表字段
            targetTable: 'User',    // 指向右表
            targetColumn: 'id'      // 右表关联字段
        },
        {
            selfColumn: 'categoryId',
            targetTable: 'Category',
            targetColumn: 'id'
        },
    ]
}
~~~

目前支持的字段类型有如下几个：
- increments/bigIncrements
- integer/bigInteger - bigInteger 字段查询返回值是一个字符串，因为 js 有可能无法正确解析
- float - 精度可选默认为 8 位，小数位数默认 2 位
- decimal - 精度可选默认为 8 位，小数位数默认 2 位
- boolean
- datetime
- string - 默认长度 255
- text
- binary
- enum

字段描述属性除了上边出现过的，还有：
- precision/scale - Integer - 针对 float/decimal 类型设定精度和小数位数
- values - Array - 针对 enum 类型指定可选值

最后给你个提示，helper 背后使用的是 knex 来实现数据库结构管理，所以你可以向 knex 文档寻求帮助。

[返回导航↑](#nav)


<div id="helper-call-create" style="width:100%;height:1px;border:none;"></div>

### 2、调用函数创建数据表

~~~
const jbdap = require('jbdap-mysql')
const helper = jbdap.helper
const conn = jbdap.getConn({
    host: '....',
    user: '....',
    pass: '....',
    dbName: '....'
})

async function create() {
    let model = require(`./model/Blog.js`)
    try {
        await helper.createTable(conn,model)
    }
    catch (err) {
        console.log(err)
    }
}

create()
~~~

[返回导航↑](#nav)

<div id="helper-drop" style="width:100%;height:1px;border:none;"></div>

## **删除数据表**

相比创建，删除数据表就容易多了

~~~
const jbdap = require('jbdap-mysql')
const helper = jbdap.helper
const conn = jbdap.getConn({
    host: '....',
    user: '....',
    pass: '....',
    dbName: '....'
})

async function drop() {
    try {
        await helper.dropTable(conn,'Blog')
    }
    catch (err) {
        console.log(err)
    }
}

drop()
~~~

[返回导航↑](#nav)

## 全文完
