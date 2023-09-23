import { ObjectId } from 'mongodb'

import { TweetAudience, TweetType } from '~/constants/enums'
import { TweetDetail } from '~/models/Others'
import databaseService from './database.services'
import tweetService from './tweets.services'

class SearchService {
    async search({ content, limit, page, user_id }: { content: string; limit: number; page: number; user_id: string }) {
        const [tweets, total] = await Promise.all([
            databaseService.tweets
                .aggregate<TweetDetail>([
                    {
                        $match: {
                            $text: {
                                $search: content
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
                ])
                .toArray(),
            databaseService.tweets
                .aggregate<{ total_tweets: number }>([
                    {
                        $match: {
                            $text: {
                                $search: content
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
                        $count: 'total_tweets'
                    }
                ])
                .toArray()
        ])
        const new_tweets = await tweetService.increaseViewMultipleTweets(tweets, user_id)

        return {
            tweets: new_tweets,
            total_tweets: total[0].total_tweets
        }
    }
}

const searchService = new SearchService()

export default searchService
