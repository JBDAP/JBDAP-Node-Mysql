# JBDAP-Node-Mysql 实例代码手册

<div id="nav" style="width:100%;height:1px;border:none;"></div>

### 目录导航

- [数据结构](#sec1)
- [简单查询](#sec2)
    - [list 查询](#sec21)
    - [entity 查询](#sec22)
    - [fields 限制返回字段](#sec23)
    - [where 查询条件](#sec24)
    - [order 数据排序](#sec25)
    - [size/page 分页及数量控制](#sec26)
    - [values 查询](#sec27)
- [简单操作](#sec3)
    - [create 操作](#sec31)
    - [update 操作](#sec32)
    - [delete 操作](#sec33)
    - [increase 操作](#sec34)
    - [decrease 操作](#sec35)
- [多指令任务](#sec4)
- [级联字段填充](#sec5)
    - [简单级联填充](#sec51)
    - [嵌套级联填充](#sec52)
- [查询结果的引用](#sec6)
    - [引用数据参与查询条件](#sec61)
    - [结果返回控制](#sec62)
    - [引用数据作为被查询数据源](#sec63)
- [前提条件与后置指令](#sec7)
- [事务支持](#sec8)
- [错误调试](#sec9)


<div style="width:100%;height:20px;border:none;"></div>
<div id="sec1" style="width:100%;height:1px;border:none;"></div>

## 1. 数据结构

为了演示 JBDAP 的能力，我在这里设计了一个多用户博客应用的数据库并填充了一些测试数据，各个表的用途及其及关联在下图中一目了然：

![数据库结构示意图](https://github.com/JBDAP/JBDAP-Node-Mysql/raw/master/doc/ER.png)

其设计遵循了几个基本原则：

- 表名及字段名遵循"驼峰命名法"
- 数据表均以 id 字段作为主键
- 数据表均包含 createdAt 和 updatedAt 两个时间戳字段
- 外键字段均以 "被关联表名(小写首字母) + Id" 的形式命名
- 为了炫耀 JBDAP 的能力，我们基本没有采用任何冗余字段设计来降低某些查询的难度

了解以上原则有助于你在看下面的例子时可以快速理解其用意。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec2" style="width:100%;height:1px;border:none;"></div>

## 2. 简单查询

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec21" style="width:100%;height:1px;border:none;"></div>

### **1 获得用户列表 - list 查询**

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
    "code": 1,
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
                "createdAt": "2019-02-28T13:27:05.150Z",
                "updatedAt": "2019-02-28T13:27:05.150Z"
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

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec22" style="width:100%;height:1px;border:none;"></div>

### **2 获得用户信息 - entity 查询**

Request:
~~~
{
    commands: [
        {
            name: 'userInfo',
            type: 'entity',     // entity 代表要获取单个数据
            target: 'User',
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
select * from `User` where (`id` = 1)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "password": "password1",
            "avatar": null,
            "email": null,
            "gender": "female",
            "createdAt": "2019-02-28T13:27:05.150Z",
            "updatedAt": "2019-02-28T13:27:05.150Z"
        }
    }
}
/**
 * 说明：
 * 1、如果符合查询条件的结果有多个，那么只返回第一个
 * 2、如果没有符合条件的，则 data.userInfo 为 null
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec23" style="width:100%;height:1px;border:none;"></div>

### **3 用 fields 来限制返回字段**

**例一：entity 查询指定字段**

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
            fields: 'id,username,avatar,email,gender'   // 限定字段
        }
    ]
}
/**
 * 说明：
 * 1、fields 不设定或者 { fields: '*' } 均意味着返回全部字段
 * 2、fields 字段可以接收数组类型，如 { fields: ['id','username','email'] }
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar`, `email`, `gender` 
from `User` 
where (`id` = 1)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "avatar": null,
            "email": null,
            "gender": "female"
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
                'updatedAt=>lastVisitedAt'      // 别名返回
            ]
        }
    ]
}
/**
 * 说明：
 * 1、list 查询和 entity 查询指定字段的方式完全一致
 * 2、允许返回数据字段别名返回，如上面 'updatedAt=>lastVisitedAt'
 *    将会把 updatedAt 改名为 lastVisitedAt 返回
 */
~~~

等效 SQL:
~~~
select `id`, `username`, `avatar`, `updatedAt` as `lastVisitedAt` 
from `User`
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "allUsers": [
            {
                "id": 1,
                "username": "user1",
                "avatar": null,
                "lastVisitedAt": "2019-02-28T13:27:05.150Z"   // 已经改名
            },
            ...     // 更多数据省略
        ]
    }
}
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec24" style="width:100%;height:1px;border:none;"></div>

### **4 通过 query.where 指定查询条件**

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
 *    字符串匹配：like, notLike
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
    "code": 1,
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
            {
                "id": 2,
                "title": "blog2",
                "content": "blog content 2 from user 1",
                "views": 953,
                "likes": 94
            },
            ...     // 更多数据省略
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
                            'createdAt#gte': '2019-02-28T13:27:05.162Z'
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
 * 1、注意这个查询条件毫无实际意义，只是为了演示 where 复杂查询能力的强大
 * 2、如果是相等运算，{ userId: 1 } 与 { 'userId#eq': 1 } 是等效的
 * 3、你会发现，这个例子多了三个分组运算符：$and, $or, $not
 *    分组运算符分别对其多个子条件进行 and, or, not 运算，然后将结果返回给父级运算
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
            and `createdAt` >= '2019-02-28T13:27:05.162Z'
        )
    ) 
    and not (
        `hearts` <= 10 and `views` <= 50
    )
)
/**
 * WOW，看这个 SQL 语句，很牛逼的样子
 * 我打赌你一般用不到这么复杂的查询，但是 JBDAP-Node-Engine 确实允许你无限写下去
 */
~~~

Response:
~~~
{
    "code": 1,
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
            {
                "id": 66,
                "title": "blog66",
                "content": "blog content 66 from user 1",
                "views": 860,
                "likes": 119
            },
            ...     // 更多数据省略
        ]
    }
}
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec25" style="width:100%;height:1px;border:none;"></div>

### **5 通过 query.order 进行数据排序**

Request:
~~~
{
    commands: [
        {
            name: 'someBlogs',
            type: 'list',
            target: 'Blog',
            query: {
                order: 'categoryId#asc,userId#desc'     // 定义排序规则
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
 * 4、{ order: ['categoryId#asc','userId#desc'] } 与上面例子是等效的
 *    用数组形式来写会更规范
 */
~~~

等效 SQL:
~~~
select * from `Blog` order by `categoryId` asc, `userId` desc
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "someBlogs": [
            ...
            {
                "id": 77,
                "userId": 9,
                "categoryId": 1,
                "title": "blog77",
                "keywords": null,
                "content": "blog content 77 from user 9",
                "views": 924,
                "hearts": 48,
                "createdAt": "2019-02-28T13:27:05.162Z",
                "updatedAt": "2019-02-28T13:27:05.162Z"
            },
            {
                "id": 59,
                "userId": 8,
                "categoryId": 1,
                "title": "blog59",
                "keywords": null,
                "content": "blog content 59 from user 8",
                "views": 157,
                "hearts": 67,
                "createdAt": "2019-02-28T13:27:05.162Z",
                "updatedAt": "2019-02-28T13:27:05.162Z"
            },
            ...     // 更多数据省略
        ]
    }
}
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec26" style="width:100%;height:1px;border:none;"></div>

### **6 通过 query.size 和 query.page 进行分页及数量控制**

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
    "code": 1,
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
    "code": 1,
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

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec27" style="width:100%;height:1px;border:none;"></div>

### **7 数据的计算后取值 - values 查询**

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
                'first#title=>latestTitle',             // 第一条记录的指定字段
                'pick#id=>blogIds',                     // 捡取指定字段拼为数组
                'clone#id,title,content,hearts=>List'   // 克隆每行数据的指定字段
            ]
        }
    ]
}
/**
 * 说明：
 * 1、请注意 fields 的定义，count, sum, max, min, avg 的用法无需多言
 * 2、最后三个比较特殊：
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
    "code": 1,
    "message": "ok",
    "data": {
        "blogStat": {
            "totalBlogs": 5,                // 总共 5 篇博客
            "totalHearts": 414,             // 总计点赞 414
            "maxViews": 122,                // 单篇最大浏览量 122
            "avgHearts": 82.8,              // 平均点赞 82.8
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
                {
                    "id": 98,
                    "title": "blog98",
                    "content": "blog content 98 from user 1",
                    "hearts": 49
                },
                ...     // 更多数据省略
            ]
        }
    }
}
~~~
[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec3" style="width:100%;height:1px;border:none;"></div>

## 3. 简单操作（增、改、删）

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec31" style="width:100%;height:1px;border:none;"></div>

### **3.1 插入数据 - create 操作**

**例一： 创建一个新用户**

Request:
~~~
{
    commands: [
        {
            name: 'newUser',
            type: 'create',         // 这里指明是 create 操作
            target: 'User',
            data: {
                username: 'just4test',
                password: 'password111',
                gender: 'female'
            }
        }
    ]
}
/**
 * 插入数据要注意两点：
 * 1、unique 字段冲突问题要提前检查
 * 2、必填字段必须保证有值
 * 不满足以上条件会报错
 */
~~~

等效 SQL:
~~~
insert into `User` 
    (`gender`, `password`, `username`) 
values 
    ('female', 'password111', 'just4test')
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "newUser": {
            "dbServer": "mysql",
            "return": [
                17
            ]
        }
    }
}
/**
 * 说明：
 * 1、不同类型数据库在执行 create, update, delete 操作后返回值不同，且无法统一
 * 2、所以如果想要使用这个返回数据，就要以 dbServer 为依据进行处理
 *    比如在数据库为 mysql 的情况下，return 目前返回的就是主键 id 的值
 *    一般情况下不建议使用 return 值作为其它操作的依据，但它的存在可以作为操作成功的标志
 *    下同
 */
~~~

**例二： 批量创建新博文**

Request:
~~~
{
    commands: [
        {
            name: 'newBlogs',
            type: 'create',
            target: 'Blog',
            data: [
                {
                    userId: 17,
                    categoryId: 1,
                    title: 'new blog 17-1',
                    createdAt: 'JBDAP.fn.ISODate',      // 服务器函数
                    updatedAt: 'JBDAP.fn.ISODate'
                },
                {
                    userId: 17,
                    categoryId: 1,
                    title: 'new blog 17-2',
                    createdAt: 'JBDAP.fn.ISODate',
                    updatedAt: 'JBDAP.fn.ISODate'
                }
            ]
        }
    ]
}
/**
 * 说明：
 * 1、给 data 传入一个数组可以批量创建数据
 *    考虑到网络传输压力和服务器性能，不建议一次批量插入超过 500 条数据
 *    且强烈建议使用事务（如何使用事务，这是后话）
 * 2、这个例子我们使用了一个名为 JBDAP.fn.ISODate 的服务端函数
 *    执行时会被替换成服务器时间的 ISO 格式，如 '2019-02-28T13:27:05.162Z'
 *    这是目前唯一一个服务端函数
 */
~~~

等效 SQL:
~~~
insert into `Blog` 
    (`categoryId`, `createdAt`, `title`, `updatedAt`, `userId`) 
    select 
        1 as `categoryId`, 
        '2019-03-11T02:26:53.366Z' as `createdAt`, 
        'new blog 17-1' as `title`, 
        '2019-03-11T02:26:53.366Z' as `updatedAt`, 
        17 as `userId` 
    union all 
    select 
        1 as `categoryId`, 
        '2019-03-11T02:26:53.366Z' as `createdAt`, 
        'new blog 17-2' as `title`, 
        '2019-03-11T02:26:53.366Z' as `updatedAt`, 
        17 as `userId`
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "newBlogs": {
            "dbServer": "mysql",
            "return": [
                104
            ]
        }
    }
}
/**
 * 说明：
 * 可以看到，我们成功插入了两条数据，但是 return 只有最后一条记录的 id 值
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec32" style="width:100%;height:1px;border:none;"></div>

### **3.2 更新数据 - update 操作**

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
                    'title#like': 'new blog 17-%'
                }
            },
            data: {
                content: 'new blog content for user i7',
                views: 100,
                hearts: 10
            }
        }
    ]
}
/**
 * 这里我们将刚才插入的两条博文进行了更新
 * data 里有的字段才会被更新
 */
~~~

等效 SQL:
~~~
update `Blog` 
set 
    `content` = 'new blog content for user i7', 
    `views` = 100, 
    `hearts` = 10 
where 
    (`userId` = 17 and `title` like 'new blog 17-%')
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "updateBlogs": {
            "dbServer": "mysql",
            "return": 2
        }
    }
}
/**
 * 说明：
 * 此处 return 值为受影响数据条数
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec33" style="width:100%;height:1px;border:none;"></div>

### **3.3 删除数据 - delete 操作**

Request:
~~~
{
    commands: [
        {
            name: 'delBlog',
            type: 'delete',         // 指明是 delete 操作
            target: 'Blog',
            query: {
                where: {
                    id: 104
                }
            }
        }
    ]
}
/**
 * 这里我们将刚才插入的两条博文之一进行了删除
 */
~~~

等效 SQL:
~~~
delete from `Blog` where (`id` = 104)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "delBlog": {
            "dbServer": "mysql",
            "return": 1
        }
    }
}
/**
 * 说明：
 * 此处 return 值为受影响数据条数
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec34" style="width:100%;height:1px;border:none;"></div>

### **3.4 原子加法更新数据 - increase 操作**

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
                    userId: 17,
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
 * 可以同时更新多个值，注意增加数字不能为负数
 */
~~~

等效 SQL:
~~~
update `Blog` 
set 
    `hearts` = `hearts` + 10, 
    `views` = `views` + 100 
where 
    (`userId` = 17)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "fakeNumbers": {
            "dbServer": "mysql",
            "return": 5
        }
    }
}
/**
 * 说明：
 * 此处 return 值为受影响数据条数
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec35" style="width:100%;height:1px;border:none;"></div>

### **3.5 原子减法更新数据 - decrease 操作**

*因为与 2.3.4 原子加法更新数据完全一致，所以不再赘述*

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec4" style="width:100%;height:1px;border:none;"></div>

## 4. 多指令任务

前面我们进行了大量的演示，相信你已经可以直观的感受到 JBDAP-Node-Engine 的特点，虽然之前所有的示例都具备一个共同点 —— 每一次请求只执行一个任务指令，但显然我们的能力不止于此，否则也就只是一个加强版的 Restful 而已，其实你从 JSON 对象的属性 commands 是一个数组就应该可以猜到，它支持一次任务请求执行多个指令。

例如，现在我们要清理掉刚才创建的那个测试用户的所有信息，就应该先删除所有属于他的博文，然后再删掉用户信息，来试一下：

Request:
~~~
{
    commands: [
        {
            name: 'delBlogs',
            type: 'delete',
            target: 'Blog',
            query: {
                where: {
                    userId: 17
                }
            }
        },
        {
            name: 'delUser',
            type: 'delete',
            target: 'User',
            query: {
                where: {
                    id: 17
                }
            }
        }
    ]
}
/**
 * 执行多条指令的时候，会按照指令在 commands 数组中出现的先后顺序执行
 */
~~~

等效 SQL:
~~~
delete from `Blog` where (`userId` = 17)
delete from `User` where (`id` = 17)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "delBlogs": {
            "dbServer": "mysql",
            "return": 5
        },
        "delUser": {
            "dbServer": "mysql",
            "return": 1
        }
    }
}
~~~

没有任何意外，两个任务依次顺利完成，是不是有点爽？

请注意，这个例子只是为了功能展示设计出来的，在实际开发中，遇到此种连续的操作（非查询）类指令的场景，为了保持数据一致性，强烈建议使用事务，我们后边会讲到。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec5" style="width:100%;height:1px;border:none;"></div>

## 5. 级联字段填充

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec51" style="width:100%;height:1px;border:none;"></div>

### **5.1 简单的级联填充**

我们希望在展示用户信息的同时得到他的最新 5 条博文，实现这个任务有两条途径：

- 后端只提供两个接口，前端进行两次查询，然后将结果拼组起来进行展示
- 前端希望一个接口解决问题，于是后端需要编写并开放出第三个接口

看起来总会有人不爽，来吧，看我们怎么解决合一问题！

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
                {   // 注意这里，我们在 fields 里面又写了一个查询指令
                    name: 'top5blogs',
                    type: 'list',
                    target: 'Blog',
                    query: {
                        where: {
                            userId: '$.id' // 这个 $ 指的是父对象,即 userInfo
                        },
                        order: 'updatedAt#desc'
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
select * from `User` where (`id` = 1)
select * from `Blog` where (`userId` = 1) order by `updatedAt` desc
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "password": "password1",
            "avatar": null,
            "email": null,
            "gender": "female",
            "createdAt": "2019-02-28T13:27:05.150Z",
            "updatedAt": "2019-02-28T13:27:05.150Z",
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
                    "createdAt": "2019-02-28T13:27:05.162Z",
                    "updatedAt": "2019-02-28T13:27:05.162Z"
                },
                ...     // 更多数据省略
            ]
        }
    }
}
/**
 * 子查询的 name 被作为级联字段的 key，查询得到的 list 结果就是该字段的值
 */
~~~

小目标顺利达成！

[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec52" style="width:100%;height:1px;border:none;"></div>

### **5.2 嵌套的级联填充**

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

select `id`, `categoryId`, `title`, `content`, `views`, `hearts` 
from `Blog` 
where (`userId` = 1) 
order by `updatedAt` desc

select `id`, `name` 
from `Category` 
where (`id` = 2)
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
    "code": 1,
    "message": "ok",
    "data": {
        "userInfo": {
            "id": 1,
            "username": "user1",
            "avatar": null,
            "lastVisitedAt": "2019-02-28T13:27:05.150Z",
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
                        {
                            "id": 888,
                            "content": "comment 888 for blog 2",
                            "hearts": 83
                        },
                        ...     // 省略 3 条 Comment 数据
                    ]
                },
                ...     // 省略 4 条 Blog 数据
            ]
        }
    }
}
~~~

大点的目标也很轻松愉快嘛，朋友，你怎么看？

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec6" style="width:100%;height:1px;border:none;"></div>

## 6. 查询结果的引用

显而易见，级联字段的填充功能真的很爽，然而它并不能解决所有问题。

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec61" style="width:100%;height:1px;border:none;"></div>

### **6.1 引用数据参与查询条件**

举个例子，我想要查出 id 为 1 的用户所收到的最新 10 条评论，怎么做呢？由于 Comment 表与 User 表之间并没有直接的关联，它们的关系要通过 Blog 建立起来，而最新 10 条评价可能出现在任意一篇 Blog 中，此时你不可能级联查出该用户所有的 Blog，然后再为每篇 Blog 级联查出所有的评论，最后一股脑全丢给前端去排序处理吧？理论上行得通，现实中不可行，一来服务器压力高，二来网络传输量大。

所以我们要换个思路：

- 首先查出该用户所有 Blog 的 id 集合，我们给它起名叫 ids 吧
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
 * 我们通过多指令的方式来实现将被引用的 userBlogs 指令查询
 * 然后在 top10comments 的查询条件中通过 /userBlogs.ids 的方式获得对该数值的引用以实现查询
 */
~~~

等效 SQL:
~~~
select * from `Blog` where (`userId` = 1)

select * 
from `Comment` 
where 
    (`id` in (2, 66, 68, 98, 99)) 
order by `id` desc 
limit 10
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "userBlogs": {
            "ids": [
                2,
                66,
                68,
                98,
                99
            ]
        },
        "top10comments": [
            {
                "id": 99,
                "blogId": 45,
                "fromUserId": 2,
                "replyTo": null,
                "content": "comment 99 for blog 45",
                "hearts": 66,
                "createdAt": "2019-02-28T13:27:05.174Z",
                "updatedAt": "2019-02-28T13:27:05.174Z"
            },
            ...     // 其余数据省略
        ]
    }
}
/**
 * 结果与预期完全一致
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec62" style="width:100%;height:1px;border:none;"></div>

### **6.2 结果的返回控制**

上面这个例子有一点奇怪的地方就是将 userBlogs 的查询结果也给返回到前端了，但其实它只是个过程产物，无需让前端知道，怎么办呢？我们只需配置一下即可：

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
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec63" style="width:100%;height:1px;border:none;"></div>

### **6.3 引用数据作为被查询数据源**

上一个例子我们成功通过引用的方式实现了一个不是那么直观的查询，但其实引用还有一个减少冗余 sql 查询的作用，再来看一个例子：

假设我们想要查出最新的 10 篇 Blog，同时要求级联填充每一篇 Blog 的 Category。这个好像比较容易呢，跟 2.5.1 的例子很像，直接用级联填充不就行了？

我们来看一下实际效果。

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
    "code": 1,
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
                "createdAt": "2019-02-28T13:27:05.162Z",
                "updatedAt": "2019-02-28T13:27:05.162Z",
                "category": {
                    "id": 2,
                    "sequence": 1,
                    "name": "政治",
                    "createdAt": "2019-02-28T13:27:05.156Z",
                    "updatedAt": "2019-02-28T13:27:05.156Z"
                }
            },
            ...     // 更多数据省略
        ]
    }
}
~~~

无论是查询的定义还是返回结果，都是 “看起来” 没有问题，然而仔细看一下 SQL 列表，你会发现有太多的重复查询，这 10 篇 Blog 的 CategoryId 不是 2 就是 3，然而我们却分别重复查了 7 次和 3 次，整个任务竟然执行了 11 条 SQL 语句，这种性能上的损耗是完全不可接受的。

怎么用引用查询结果的方式来解决这个问题呢？聪明的你也许已经想到了，我们可以先查出最新的 10 篇 Blog，然后取出它们的 categoryId 数组，然后用 in 查询得到两条 Category 数据，再把它们分别填充到对应的 Blog 数据下作为级联字段就好啦。思路是对的，我的方式可能更加巧妙。

Request:
~~~
{
    commands: [
        {
            return: false,          // 不返回
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
            return: false,          // 不返回
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
    "code": 1,
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
                "createdAt": "2019-02-28T13:27:05.162Z",
                "updatedAt": "2019-02-28T13:27:05.162Z",
                "category": {
                    "id": 2,
                    "sequence": 1,
                    "name": "政治",
                    "createdAt": "2019-02-28T13:27:05.156Z",
                    "updatedAt": "2019-02-28T13:27:05.156Z"
                }
            },
            ...     // 剩余数据省略
        ]
    }
}
~~~

这种方式执行的 SQL 语句就只有两条了，结果是一样的结果，然而过程和性能大相径庭。

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec7" style="width:100%;height:1px;border:none;"></div>

## 7. 前提条件与后置指令

在实际开发过程中，数据库的操作往往是跟逻辑判断紧密结合在一起的，最基本的就是顺序执行、条件分支，为了满足这一方面的需要，我们提供了两个功能来帮助开发人员在一次交互任务中可以执行尽可能多的逻辑和指令。

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec71" style="width:100%;height:1px;border:none;"></div>

### **7.1 onlyIf 前提条件**

任何一个指令，无论是顶层还是级联或者引用，都可以通过 onlyIf 来设置一个或一组执行的前提条件，只有当 onlyIf 运算的返回值为 true 时，指令才会得以执行，否则会返回 null 值。

举个例子：要创建一个新用户，但是我们不知道 username 是否已经存在，如果贸然将用户输入的用户名直接提交到数据库，很有可能会因为用户名冲突而造成直接失败，所以在创建新用户之前我们应当先检查用户名是否存在，只有当用户名不存在的时候才创建新用户，这样就可以精确控制流程了。

Request:
~~~
{
    commands: [
        {
            return: false,                  // 无需返回
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
                createdAt: 'JBDAP.fn.ISODate',
                updatedAt: 'JBDAP.fn.ISODate'
            }
        }
    ]
}
/**
 * 说明：
 * onlyIf 与 where 的定义方式和运算规则基本一致，支持分组运算，但是也有小的区别如下：
 * 1、where 其下每一个键值对叫做一个查询条件，其键名中 # 的左边只能是 field 名称
 * 2、onlyIf 其下的每一个键值对则叫做一个比较表达式，其键名中 # 的左边是可以进行赋值的表达式
 * 3、两者运算符也有不同
 *    没有 like 和 notLike
 *    没有 between 和 notBetween
 *    新增 match 和 notMatch
 *    新增 exist 和 notExist
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
    ('2019-03-11T13:31:25.194Z', 'female', 'password111', '2019-03-11T13:31:25.195Z', 'user100')
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "newUser": {
            "dbServer": "mysql",
            "return": [
                18
            ]
        }
    }
}
/**
 * 注意：
 * 这是没有用户名冲突执行成功的结果，如果存在冲突的话，返回值 newUser 将会是 null
 */
~~~
[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec71" style="width:100%;height:1px;border:none;"></div>

### **7.2 after 后置命令**

某种程度上来说，after 和 onlyIf 作用有相似的地方，比如都是先执行某一个指令之后再执行后面的指令，而且往往第一个指令的执行结果会成为后面指令的条件相关项。after 的执行时间点在填充级联字段之后。

因此上面先查询再创建新用户的例子，我们也可以用 after 来实现，但是需要注意的是，after 包含的所有指令执行结果均不会被显式的返回，因此虽然可以达到同样的效果，但是不利于前端通过返回内容来判断执行结果，因此这种情况下是不推荐用 after 的。

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
                data: 'views:1'
            }
        }
    ]
}
/**
 * 查询 blog 详情的时候，顺道就把访问量加 1 的工作给做了。
 * 注意：after 可以接受数组参数，也就是说主指令执行完成后可以执行一系列指令
 * 与此同时，在 after 指令里面，继续使用 onlyIf 判断可以进一步加强对数据操作流程的掌控
 */
~~~

等效 SQL:
~~~
select * from `Blog` where (`id` = 1)
update `Blog` set `views` = `views` + 1 where (`id` = 1)
~~~

Response:
~~~
{
    "code": 1,
    "message": "ok",
    "data": {
        "blogInfo": {
            "id": 1,
            "userId": 4,
            "categoryId": 1,
            "title": "blog1",
            "keywords": null,
            "content": "blog content 1 from user 4",
            "views": 753,
            "hearts": 55,
            "createdAt": "2019-02-28T13:27:05.162Z",
            "updatedAt": "2019-02-28T13:27:05.162Z"
        }
    }
}
/**
 * 我们关注的重心依然是 blog 详情本身
 */
~~~
[返回导航↑](#nav)

#### 强烈提醒注意！当 after 指令中存在 create, update, delete, increase, decrease 等非查询指令时（很多时候都是这样的），你应该开启事务支持，这样才能保证数据的一致性。

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec8" style="width:100%;height:1px;border:none;"></div>

## 8. 事务支持

终于到了这个关系型数据库的核心优势了，不管你使用什么开发环境或者 ORM 框架，在编码中按需使用事务一般来说还是比较费事的，然而在我们这里就不一样了，拿之前用过的连续从两个表删除数据的例子来说明，直接上代码：

~~~
{
    isTransaction: true,        // 没错，你只要把 isTransaction 配置为 true 就可以了
    commands: [
        {
            name: 'delBlogs',
            type: 'delete',
            target: 'Blog',
            query: {
                where: {
                    userId: 17
                }
            }
        },
        {
            name: 'delUser',
            type: 'delete',
            target: 'User',
            query: {
                where: {
                    id: 17
                }
            }
        }
    ]
}
~~~

SQL 及 Response 代码这里就不再贴了，没有区别。

最后重申一下事务的使用场景：

- 在一个 JBDAP 任务中存在多个非查询指令，则必须使用事务
- 如果存在多个操作指令，其中有 1 个是非查询指令，则建议开启事务
- 存在多个操作指令，只有最后 1 个操作是非查询指令，此时可以不开启事务，考虑到如果是多个关系复杂的操作指令，你可能需要花费一些时间才能理清非查询指令是不是最后 1 个，所以建议干脆都开启事务得了
- JBDAP 任务中只有一个非查询指令，此时可以不开启事务

[返回导航↑](#nav)

<div style="width:100%;height:20px;border:none;"></div>
<div id="sec9" style="width:100%;height:1px;border:none;"></div>

## 9. 错误调试

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec91" style="width:100%;height:1px;border:none;"></div>

### **9.1 内置错误信息**

当你的调用出错时，层层递进的错误提示信息会出现在 message 字段中，基本上你仅凭这些信息已经足以找到自己的问题所在，比如这个：

~~~
{
    "code": 0,
    "message": "[CmdExecError]：解析或执行指令失败 <= [JBDAPCommandError]：处理指令 \"newUser\" 出错 <= [DBExecError]：操作数据出错 <= [Error]：insert into `User` (`gender`, `password`, `username`) values ('female', 'password111', 'just4test') - SQLITE_CONSTRAINT: UNIQUE constraint failed: User.username",
    "data": null
}
~~~

把 message 单独拿出来整理一下格式是这样的

~~~
[CmdExecError]：解析或执行指令失败 
    <= [JBDAPCommandError]：处理指令 \"newUser\" 出错 
    <= [DBExecError]：操作数据出错 
    <= [Error]：
        insert into `User` 
            (`gender`, `password`, `username`) 
        values 
            ('female', 'password111', 'just4test') 
        - SQLITE_CONSTRAINT: UNIQUE constraint failed: User.username
~~~

这样就一目了然了，因为你提交的 username 跟已有数据发生了冲突。

如果你还想看到服务端的错误堆栈信息，给请求的 json 添加一个 needTrace: true 属性即可。

[返回导航↑](#nav)

<div style="width:100%;height:10px;border:none;"></div>
<div id="sec92" style="width:100%;height:1px;border:none;"></div>

### **9.2 服务端 logs**

如果你希望检查指令在服务端的运行顺序是否如自己预期，可以将 needLogs 配置为 true

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
                        order: 'updatedAt#desc'
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
    "code": 1,
    "message": "ok",
    "data": {
        "userInfo": {
            ...     // 省略
        }
    },
    "logs": [
        "- 开启 JBDAP 任务",
        "- 检查接收到的 JSON 是否合法",
        "* 用户身份校验",
        "- 开始处理接收到的指令",
        "- 非事务方式执行",
        "$ 开始执行顶层指令 /userInfo - entity 类型",
        "  @ 开始执行级联指令 [top5blogs] - list 类型",
        "  @ 级联指令 [top5blogs] 执行完毕",
        "$ 顶层指令 /userInfo 执行完毕",
        "- 全部指令处理完成",
        "- JBDAP 任务成功"
    ]
}
~~~

你会看到返回数据里面多了一个 logs 属性，这个数组保存了你提交的 Request 代码到达服务端后发生了什么，是不是很酷？

[返回导航↑](#nav)

## *(To Be Continued)*