import { ObjectId, WithId } from 'mongodb'

import { TweetAudience, TweetType } from '~/constants/enums'
import { CreateTweetReqBody } from '~/models/requests/Tweet.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import Hashtag from '~/models/schemas/Hashtag.schema'
import { TweetDetail } from '~/models/Others'
import databaseService from './database.services'

class TweetService {
    async checkAndCreateHashtag(hashtags: string[]) {
        const hashtagDocuments = await Promise.all(
            hashtags.map((hashtag) => {
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
        const hashtagIds = hashtagDocuments.map((hashtagDocument) => {
            return (hashtagDocument.value as WithId<Hashtag>)._id
        })

        return hashtagIds
    }

    async createTweet(user_id: string, payload: CreateTweetReqBody) {
        const hashtags = await this.checkAndCreateHashtag(payload.hashtags)

        const result = await databaseService.tweets.insertOne(
            new Tweet({
                ...payload,
                user_id: new ObjectId(user_id),
                hashtags
            })
        )
        const tweet = await databaseService.tweets.findOne({ _id: result.insertedId })

        return tweet
    }

    async increaseView(tweet_id: string, user_id?: string) {
        const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
        const result = await databaseService.tweets.findOneAndUpdate(
            { _id: new ObjectId(tweet_id) },
            {
                $inc: inc,
                $currentDate: {
                    updated_at: true
                }
            },
            {
                returnDocument: 'after',
                projection: {
                    user_views: 1,
                    guest_views: 1,
                    updated_at: 1
                }
            }
        )

        return result.value as WithId<{
            user_views: number
            guest_views: number
            updated_at: Date
        }>
    }

    async increaseViewMultipleTweets(tweets: TweetDetail[], user_id?: string) {
        const increaseViewResults: WithId<{
            user_views: number
            guest_views: number
            updated_at: Date
        }>[] = await Promise.all(
            tweets.map(async (tweet) => {
                const result = await this.increaseView((tweet._id as ObjectId).toString(), user_id)

                return result
            })
        )

        return tweets.map(
            (tweet, index) =>
                ({
                    ...tweet,
                    ...increaseViewResults[index]
                }) as TweetDetail
        )
    }

    async getTweetChildren({
        tweet_id,
        limit,
        page,
        tweet_type,
        user_id
    }: {
        tweet_id: string
        limit: number
        page: number
        tweet_type: TweetType
        user_id?: string
    }) {
<<<<<<< HEAD
        const result = await databaseService.tweets
=======
        const [{ tweets, total_tweets }] = await databaseService.tweets
>>>>>>> 739f4a1ed930433737f551b0445c0ce96b22af60
            .aggregate<{
                tweets: TweetDetail[]
                total_tweets: number
            }>([
                {
                    $match: {
                        parent_id: new ObjectId(tweet_id),
                        type: tweet_type
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $addFields: {
                        user: {
                            $arrayElemAt: ['$user', 0]
                        }
                    }
                },
                {
                    $match: {
                        $or: [
                            {
                                audience: TweetAudience.Everyone
                            },
                            {
                                $and: [
                                    {
                                        audience: TweetAudience.TwitterCircle
                                    },
                                    {
                                        'user.twitter_circle': {
                                            $in: [new ObjectId(user_id)]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    $facet: {
                        tweets: [
                            {
                                $skip: limit * (page - 1)
                            },
                            {
                                $limit: limit
                            },
                            {
                                $lookup: {
                                    from: 'hashtags',
                                    localField: 'hashtags',
                                    foreignField: '_id',
                                    as: 'hashtags'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'mentions',
                                    foreignField: '_id',
                                    as: 'mentions'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'bookmarks',
                                    localField: '_id',
                                    foreignField: 'tweet_id',
                                    as: 'bookmarks'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'likes',
                                    localField: '_id',
                                    foreignField: 'tweet_id',
                                    as: 'likes'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'tweets',
                                    localField: '_id',
                                    foreignField: 'parent_id',
                                    as: 'tweet_children'
                                }
                            },
                            {
                                $addFields: {
                                    mentions: {
                                        $map: {
                                            input: '$mentions',
                                            as: 'mention',
                                            in: {
                                                _id: '$$mention._id',
                                                name: '$$mention.name',
                                                email: '$$mention.email',
                                                username: '$$mention.username'
                                            }
                                        }
                                    },
                                    bookmarks: {
                                        $size: '$bookmarks'
                                    },
                                    likes: {
                                        $size: '$likes'
                                    },
                                    retweet_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.Retweet]
                                                }
                                            }
                                        }
                                    },
                                    comment_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.Comment]
                                                }
                                            }
                                        }
                                    },
                                    quotetweet_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.QuoteTweet]
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    tweet_children: 0,
                                    user: {
                                        date_of_birth: 0,
                                        password: 0,
                                        email_verify_token: 0,
                                        forgot_password_token: 0,
                                        twitter_circle: 0
                                    }
                                }
                            }
                        ],
                        total: [
                            {
                                $count: 'total_tweets'
                            }
                        ]
                    }
                },
                {
                    $unwind: '$total'
                },
                {
                    $project: {
                        tweets: '$tweets',
                        total_tweets: '$total.total_tweets'
                    }
                }
            ])
            .toArray()
<<<<<<< HEAD

        if (result.length !== 0) {
            const { tweets, total_tweets } = result[0]
            const new_tweets = await tweetService.increaseViewMultipleTweets(tweets, user_id)

            return {
                tweets: new_tweets,
                total_tweets
            }
        }
=======
        const new_tweets = await this.increaseViewMultipleTweets(tweets, user_id)
>>>>>>> 739f4a1ed930433737f551b0445c0ce96b22af60

        return {
            tweets: [],
            total_tweets: 0
        }
    }

    async getNewFeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
        const followed_user_ids = (
            await databaseService.followers
                .find(
                    { user_id: new ObjectId(user_id) },
                    {
                        projection: {
                            followed_user_id: 1
                        }
                    }
                )
                .toArray()
        ).map((follower) => follower.followed_user_id)

        followed_user_ids.push(new ObjectId(user_id))

<<<<<<< HEAD
        const result = await databaseService.tweets
=======
        const [{ tweets, total_tweets }] = await databaseService.tweets
>>>>>>> 739f4a1ed930433737f551b0445c0ce96b22af60
            .aggregate<{
                tweets: TweetDetail[]
                total_tweets: number
            }>([
                {
                    $match: {
                        user_id: {
                            $in: followed_user_ids
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $addFields: {
                        user: {
                            $arrayElemAt: ['$user', 0]
                        }
                    }
                },
                {
                    $match: {
                        $or: [
                            {
                                audience: TweetAudience.Everyone
                            },
                            {
                                $and: [
                                    {
                                        audience: TweetAudience.TwitterCircle
                                    },
                                    {
                                        'user.twitter_circle': {
                                            $in: [new ObjectId(user_id)]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    $facet: {
                        tweets: [
                            {
                                $skip: limit * (page - 1)
                            },
                            {
                                $limit: limit
                            },
                            {
                                $lookup: {
                                    from: 'hashtags',
                                    localField: 'hashtags',
                                    foreignField: '_id',
                                    as: 'hashtags'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'mentions',
                                    foreignField: '_id',
                                    as: 'mentions'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'bookmarks',
                                    localField: '_id',
                                    foreignField: 'tweet_id',
                                    as: 'bookmarks'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'likes',
                                    localField: '_id',
                                    foreignField: 'tweet_id',
                                    as: 'likes'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'tweets',
                                    localField: '_id',
                                    foreignField: 'parent_id',
                                    as: 'tweet_children'
                                }
                            },
                            {
                                $addFields: {
                                    mentions: {
                                        $map: {
                                            input: '$mentions',
                                            as: 'mention',
                                            in: {
                                                _id: '$$mention._id',
                                                name: '$$mention.name',
                                                email: '$$mention.email',
                                                username: '$$mention.username'
                                            }
                                        }
                                    },
                                    bookmarks: {
                                        $size: '$bookmarks'
                                    },
                                    likes: {
                                        $size: '$likes'
                                    },
                                    retweet_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.Retweet]
                                                }
                                            }
                                        }
                                    },
                                    comment_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.Comment]
                                                }
                                            }
                                        }
                                    },
                                    quotetweet_count: {
                                        $size: {
                                            $filter: {
                                                input: '$tweet_children',
                                                as: 'tweet_child',
                                                cond: {
                                                    $eq: ['$$tweet_child.type', TweetType.QuoteTweet]
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    tweet_children: 0,
                                    user: {
                                        date_of_birth: 0,
                                        password: 0,
                                        email_verify_token: 0,
                                        forgot_password_token: 0,
                                        twitter_circle: 0
                                    }
                                }
                            }
                        ],
                        total: [
                            {
                                $count: 'total_tweets'
                            }
                        ]
                    }
                },
                {
                    $unwind: '$total'
                },
                {
                    $project: {
                        tweets: '$tweets',
                        total_tweets: '$total.total_tweets'
                    }
                }
            ])
            .toArray()
<<<<<<< HEAD

        if (result.length !== 0) {
            const { tweets, total_tweets } = result[0]
            const new_tweets = await tweetService.increaseViewMultipleTweets(tweets, user_id)

            return {
                tweets: new_tweets,
                total_tweets
            }
        }

        return {
            tweets: [],
            total_tweets: 0
=======
        const new_tweets = await this.increaseViewMultipleTweets(tweets, user_id)

        return {
            tweets: new_tweets,
            total_tweets
>>>>>>> 739f4a1ed930433737f551b0445c0ce96b22af60
        }
    }
}

const tweetService = new TweetService()

export default tweetService
