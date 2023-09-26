import { faker } from '@faker-js/faker'
import { ObjectId, WithId } from 'mongodb'

import { MediaTypes, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import { CreateTweetReqBody } from '~/models/requests/Tweet.requests'
import { RegisterReqBody } from '~/models/requests/User.requests'
import Follower from '~/models/schemas/Follower.schema'
import Hashtag from '~/models/schemas/Hashtag.schema'
import Tweet from '~/models/schemas/Tweet.schema'
import User from '~/models/schemas/User.schema'
import databaseService from '~/services/database.services'
import { hashPassword } from '~/utils/crypto'

/**
 * Yêu cầu: Mọi người phải cài đặt `@faker-js/faker` vào project
 * Cài đặt: `npm i @faker-js/faker`
 */

// Mật khẩu cho các fake user
const PASSWORD = 'Viet@2002'
// ID của tài khoản của mình, dùng để follow người khác
const MYID = new ObjectId('650d19a86beb14d2fb948ab5')

// Số lượng user được tạo, mỗi user sẽ mặc định tweet 2 cái
const USER_COUNT = 500

const createRandomUser = () => {
    const user: RegisterReqBody = {
        name: faker.internet.displayName(),
        email: faker.internet.email(),
        password: PASSWORD,
        confirm_password: PASSWORD,
        date_of_birth: faker.date.past().toISOString()
    }

    return user
}

const createRandomTweet = () => {
    const tweet: CreateTweetReqBody = {
        type: TweetType.Tweet,
        audience: TweetAudience.Everyone,
        content: faker.lorem.paragraph({
            min: 10,
            max: 160
        }),
        parent_id: null,
        hashtags: ['NodeJS', 'MongoDB', 'ExpressJS', 'Swagger', 'Docker', 'Socket.io'],
        mentions: [],
        medias: [
            {
                url: faker.image.url(),
                type: MediaTypes.Image
            }
        ]
    }

    return tweet
}
const users: RegisterReqBody[] = faker.helpers.multiple(createRandomUser, {
    count: USER_COUNT
})

const insertMultipleUsers = async (users: RegisterReqBody[]) => {
    console.log('Creating users...')

    const result = await Promise.all(
        users.map(async (user, index) => {
            const user_id = new ObjectId()

            await databaseService.users.insertOne(
                new User({
                    ...user,
                    _id: user_id,
                    password: hashPassword(user.password),
                    date_of_birth: new Date(user.date_of_birth),
                    verify: UserVerifyStatus.Verified,
                    username: `user${user_id.toString()}`
                })
            )

            console.log(`Created user ${index + 1}/${users.length}`)

            return user_id
        })
    )

    console.log(`Done creating ${result.length} users`)

    return result
}

const followMultipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
    console.log('Start following...')

    const result = await Promise.all(
        followed_user_ids.map(async (followed_user_id, index) => {
            const randomPercentage = Math.random() * 101

            if (randomPercentage > 50) {
                console.log('Not followed')
                return
            }

            const oke = await databaseService.followers.insertOne(
                new Follower({
                    user_id,
                    followed_user_id
                })
            )

            console.log(`Followed user ${index + 1}/${users.length}`)

            return oke
        })
    )

    console.log(`Done followed ${result.length} users`)
}

const checkAndCreateHashtags = async (hashtags: string[]) => {
    const hashtagDocuemts = await Promise.all(
        hashtags.map((hashtag) => {
            // Tìm hashtag trong database, nếu có thì lấy, không thì tạo mới
            return databaseService.hashtags.findOneAndUpdate(
                { name: hashtag },
                {
                    $setOnInsert: new Hashtag({ name: hashtag })
                },
                {
                    upsert: true,
                    returnDocument: 'after'
                }
            )
        })
    )

    return hashtagDocuemts.map((hashtag) => (hashtag.value as WithId<Hashtag>)._id)
}

const insertTweet = async (user_id: ObjectId, body: CreateTweetReqBody) => {
    const hashtags = await checkAndCreateHashtags(body.hashtags)
    const result = await databaseService.tweets.insertOne(
        new Tweet({
            ...body,
            user_id: new ObjectId(user_id),
            hashtags
        })
    )

    return result
}

const insertMultipleTweets = async (user_ids: ObjectId[]) => {
    console.log('Creating tweets...')
    console.log(`Counting...`)

    let count = 0
    const result = await Promise.all(
        user_ids.map(async (user_id, index) => {
            await Promise.all([insertTweet(user_id, createRandomTweet()), insertTweet(user_id, createRandomTweet())])
            count += 2

            console.log(`Created ${count} tweets`)
        })
    )

    return result
}

insertMultipleUsers(users).then((user_ids) => {
    followMultipleUsers(new ObjectId(MYID), user_ids).catch((err) => {
        console.error('Error when following users')
        console.log(err)
    })
    insertMultipleTweets(user_ids).catch((err) => {
        console.error('Error when creating tweets')
        console.log(err)
    })
})
