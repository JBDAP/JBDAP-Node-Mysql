module.exports.single = {
    needLogs: true,
    commands: [
        {
            name: 'insertCategory1',
            type: 'create',
            target: 'Category',
            data: {
                name: '政治',
            },
        },
        {
            name: 'insertCategory2',
            type: 'create',
            target: 'Category',
            data: {
                name: '经济',
                sequence: 2,
            },
        },
        {
            name: 'insertCategory3',
            type: 'create',
            target: 'Category',
            data: {
                name: '历史',
                sequence: 3,
            },
        },
        {
            name: 'getCount',
            type: 'values',
            target: 'Category',
            fields: [
                'count#id=>total'
            ]
        },
        {
            name: 'getEntity',
            type: 'entity',
            target: 'Category',
            query: {
                where: {
                    name: '政治'
                }
            },
            fields: '*'
        },
    ]
}

let users = []
for (let i=1; i<=10; i++) {
    users.push({
        username: 'user' + i,
        password: 'password' + i,
        gender: Math.round(i/2) === (i/2) ? 'MALE' : 'FEMALE',
    })
}

module.exports.batch = {
    needLogs: true,
    commands: [
        {
            name: 'insertUserList',
            type: 'create',
            target: 'User',
            data: users
        },
        {
            name: 'getCount',
            type: 'values',
            target: 'User',
            fields: [
                'count#id=>total'
            ]
        }
    ]
}

let categories = [
    {
        name: '政治',
        sequence: 1,
    },
    {
        name: '经济',
        sequence: 2,
    },
    {
        name: '历史',
        sequence: 3,
    },
]

let blogs = []
for (let i=1; i<=100; i++) {
    let rdm = Number.randomBetween(1,10)
    blogs.push({
        userId: rdm,
        categoryId: Number.randomBetween(1,3),
        title: 'blog' + i,
        content: 'blog content ' + i + ' from user ' + rdm,
        views: Number.randomBetween(1,1000),
        hearts: Number.randomBetween(1,100),
    })
}

let comments = []
for (let i=1; i<=500; i++) {
    let rdm = Number.randomBetween(1,100)
    comments.push({
        blogId: rdm,
        fromUserId: Number.randomBetween(1,10),
        replyTo: null,
        content: 'comment ' + i + ' for blog ' + rdm,
        hearts: Number.randomBetween(1,100),
    })
}

let subscriptions = []
for (let i=1; i<=50; i++) {
    function makeOne() {
        let rdm1 = Number.randomBetween(1,10)
        let rdm2 = Number.randomBetween(1,10)
        if (rdm1 !== rdm2) return {
            authorId: rdm1,
            subscriberId: rdm2,
        }
        else return makeOne()
    }
    function pushOne() {
        let item = makeOne()
        if (_.findIndex(subscriptions, {authorId:item.authorId, subscriberId:item.subscriberId}) < 0) subscriptions.push(item)
        else pushOne()
    }
    pushOne()
}

module.exports.initData = {
    needLogs: true,
    isTransaction: true,
    commands: [
        {
            name: 'insertUsers',
            type: 'create',
            target: 'User',
            data: users
        },
        {
            name: 'insertCategories',
            type: 'create',
            target: 'Category',
            data: categories
        },
        {
            name: 'insertBlogs',
            type: 'create',
            target: 'Blog',
            data: blogs
        },
        {
            name: 'insertComments',
            type: 'create',
            target: 'Comment',
            data: comments
        },
        {
            name: 'insertSubscriptions',
            type: 'create',
            target: 'Subscription',
            data: subscriptions
        },
    ]
}