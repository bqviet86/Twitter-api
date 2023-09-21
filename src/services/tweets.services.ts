import { ObjectId, WithId } from 'mongodb'

import { TweetType } from '~/constants/enums'
import { CreateTweetReqBody } from '~/models/requests/Tweet.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import Hashtag from '~/models/schemas/Hashtag.schema'
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
        const [tweets, total_tweets] = await Promise.all([
            databaseService.tweets
                .aggregate<Tweet>([
                    {
                        $match: {
                            parent_id: new ObjectId(tweet_id),
                            type: tweet_type
                        }
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
                            hashtags: {
                                $map: {
                                    input: '$hashtags',
                                    as: 'hashtag',
                                    in: {
                                        _id: '$$hashtag._id',
                                        name: '$$hashtag.name'
                                    }
                                }
                            },
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
                            tweet_children: 0
                        }
                    },
                    {
                        $skip: limit * (page - 1)
                    },
                    {
                        $limit: limit
                    }
                ])
                .toArray(),
            databaseService.tweets.countDocuments({
                parent_id: new ObjectId(tweet_id),
                type: tweet_type
            })
        ])
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

        tweets.forEach((tweet, index) => {
            tweets[index] = {
                ...tweet,
                ...increaseViewResults[index]
            }
        })

        return { tweets, total_tweets }
    }
}

const tweetService = new TweetService()

export default tweetService
