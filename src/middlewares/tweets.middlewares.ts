import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { isEmpty } from 'lodash'

import { TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { TWEETS_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import { CreateTweetReqBody } from '~/models/requests/Tweet.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from '~/services/database.services'
import { numberEnumToArray } from '~/utils/commons'
import { validate } from '~/utils/validation'
import { isMedia } from '~/utils/check'

const tweetTypeValues = numberEnumToArray(TweetType)
const tweetAudienceValues = numberEnumToArray(TweetAudience)

export const createTweetValidator = validate(
    checkSchema(
        {
            type: {
                isIn: {
                    options: [tweetTypeValues],
                    errorMessage: TWEETS_MESSAGES.INVALID_TYPE
                }
            },
            audience: {
                isIn: {
                    options: [tweetAudienceValues],
                    errorMessage: TWEETS_MESSAGES.INVALID_AUDIENCE
                }
            },
            content: {
                isString: true,
                custom: {
                    options: (value: string, { req }) => {
                        const reqBody = req.body as CreateTweetReqBody
                        const type = reqBody.type
                        const hashtags = reqBody.hashtags
                        const mentions = reqBody.mentions

                        // Nếu type là retweet thì content phải là ''
                        if (type === TweetType.Retweet && value !== '') {
                            throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_EMPTY_STRING)
                        }

                        // Nếu type là tweet, comment, quotetweet và không có hashtags và mentions thì content phải là string và không được rỗng
                        if (
                            [TweetType.Tweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
                            isEmpty(hashtags) &&
                            isEmpty(mentions) &&
                            value === ''
                        ) {
                            throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING)
                        }

                        return true
                    }
                }
            },
            parent_id: {
                custom: {
                    options: (value, { req }) => {
                        const type = (req.body as CreateTweetReqBody).type

                        // Nếu type là retweet, comment, quotetweet thì parent_id phải là tweet_id của tweet cha
                        if (
                            [TweetType.Retweet, TweetType.Comment, TweetType.QuoteTweet].includes(type) &&
                            !ObjectId.isValid(value)
                        ) {
                            throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_A_VALID_TWEET_ID)
                        }

                        // Nếu type là tweet thì parent_id phải là null
                        if (type === TweetType.Tweet && value !== null) {
                            throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_NULL)
                        }

                        return true
                    }
                }
            },
            hashtags: {
                isArray: true,
                custom: {
                    options: (value: string[]) => {
                        // hashtags phải là mảng các string
                        if (value.some((hashtag) => typeof hashtag !== 'string')) {
                            throw new Error(TWEETS_MESSAGES.HASHTAGS_MUST_BE_AN_ARRAY_OF_STRING)
                        }

                        return true
                    }
                }
            },
            mentions: {
                isArray: true,
                custom: {
                    options: (value: string[]) => {
                        // mentions phải là mảng các string dạng id
                        if (value.some((mention) => !ObjectId.isValid(mention))) {
                            throw new Error(TWEETS_MESSAGES.MENTIONS_MUST_BE_AN_ARRAY_OF_USER_ID)
                        }

                        return true
                    }
                }
            },
            medias: {
                isArray: true,
                custom: {
                    options: (value: string[]) => {
                        // medias phải là mảng các Media
                        if (value.some((media) => !isMedia(media))) {
                            throw new Error(TWEETS_MESSAGES.MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECT)
                        }

                        return true
                    }
                }
            }
        },
        ['body']
    )
)

export const tweetIdValidator = validate(
    checkSchema(
        {
            tweet_id: {
                custom: {
                    options: async (value: string, { req }) => {
                        if (!value) {
                            throw new ErrorWithStatus({
                                status: HTTP_STATUS.BAD_REQUEST,
                                message: TWEETS_MESSAGES.TWEET_ID_IS_REQUIRED
                            })
                        }

                        if (!ObjectId.isValid(value)) {
                            throw new ErrorWithStatus({
                                status: HTTP_STATUS.BAD_REQUEST,
                                message: TWEETS_MESSAGES.INVALID_TWEET_ID
                            })
                        }

                        const [tweet] = await databaseService.tweets
                            .aggregate<Tweet>([
                                {
                                    $match: {
                                        _id: new ObjectId(value)
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
                                                        $eq: ['$$tweet_child.type', 1]
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
                                                        $eq: ['$$tweet_child.type', 2]
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
                                                        $eq: ['$$tweet_child.type', 3]
                                                    }
                                                }
                                            }
                                        },
                                        views: {
                                            $add: ['$guest_views', '$user_views']
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        tweet_children: 0
                                    }
                                }
                            ])
                            .toArray()

                        if (tweet === null) {
                            throw new ErrorWithStatus({
                                status: HTTP_STATUS.NOT_FOUND,
                                message: TWEETS_MESSAGES.TWEET_NOT_FOUND
                            })
                        }

                        ;(req as Request).tweet = tweet

                        return true
                    }
                }
            }
        },
        ['params', 'body']
    )
)

export const audienceValidator = async (req: Request, res: Response, next: NextFunction) => {
    const tweet = req.tweet as Tweet

    // Validate người xem trong trường hợp tweet có twitter_circle còn everyone thì không cần
    if (tweet.audience === TweetAudience.TwitterCircle) {
        // Kiểm tra người xem tweet này đã đăng nhập hay chưa
        if (!req.decoded_authorization) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
            })
        }

        // Kiểm tra tài khoản tắc giả có bị khóa hay không
        const author = await databaseService.users.findOne({ _id: tweet.user_id })

        if (!author || author.verify === UserVerifyStatus.Banned) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: USERS_MESSAGES.USER_NOT_FOUND
            })
        }

        // Kiểm tra người xem tweet này có nằm trong twitter_circle của tác giả hay không
        // Nếu không thì kiểm tra người xem tweet này có phải là tác giả hay không
        // Người dùng chỉ được xem khi nằm trong twitter_circle hoặc là chính tác giả
        const user_id = req.decoded_authorization.user_id
        const isInTwitterCircle = author.twitter_circle.some((user_id_in_circle) => user_id_in_circle.equals(user_id))
        const isAuthor = author._id.equals(user_id)

        if (!isInTwitterCircle && !isAuthor) {
            throw new ErrorWithStatus({
                status: HTTP_STATUS.FORBIDDEN,
                message: TWEETS_MESSAGES.TWEET_IS_NOT_PUBLIC
            })
        }
    }

    next()
}
