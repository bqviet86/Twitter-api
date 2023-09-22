import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

import { TweetType } from '~/constants/enums'
import { TWEETS_MESSAGES } from '~/constants/messages'
import {
    CreateTweetReqBody,
    GetNewFeedsReqQuery,
    GetTweetChildrenReqParams,
    GetTweetChildrenReqQuery,
    GetTweetReqParams
} from '~/models/requests/Tweet.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import tweetService from '~/services/tweets.services'

export const createTweetController = async (req: Request<ParamsDictionary, any, CreateTweetReqBody>, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const result = await tweetService.createTweet(user_id, req.body)

    return res.json({
        message: TWEETS_MESSAGES.CREATE_TWEET_SUCCESSFULLY,
        result
    })
}

export const getTweetController = async (req: Request<GetTweetReqParams>, res: Response) => {
    const { tweet_id } = req.params
    const { user_id } = req.decoded_authorization as TokenPayload
    const result = await tweetService.increaseView(tweet_id, user_id)
    const tweet = {
        ...(req.tweet as Tweet),
        ...result
    } as Tweet

    return res.json({
        message: TWEETS_MESSAGES.GET_TWEET_SUCCESSFULLY,
        result: tweet
    })
}

export const getTweetChildrenController = async (
    req: Request<GetTweetChildrenReqParams, any, any, GetTweetChildrenReqQuery>,
    res: Response
) => {
    const { tweet_id } = req.params
    const limit = Number(req.query.limit)
    const page = Number(req.query.page)
    const tweet_type = Number(req.query.tweet_type) as TweetType
    const { user_id } = req.decoded_authorization as TokenPayload
    const result = await tweetService.getTweetChildren({ tweet_id, limit, page, tweet_type, user_id })
    let message: string

    switch (Number(tweet_type)) {
        case TweetType.Retweet:
            message = TWEETS_MESSAGES.GET_RETWEETS_SUCCESSFULLY
            break
        case TweetType.Comment:
            message = TWEETS_MESSAGES.GET_COMMENTS_SUCCESSFULLY
            break
        case TweetType.QuoteTweet:
            message = TWEETS_MESSAGES.GET_QUOTETWEETS_SUCCESSFULLY
            break
        default:
            message = TWEETS_MESSAGES.INVALID_TYPE
    }

    return res.json({
        message,
        result: {
            tweets: result.tweets,
            limit,
            page,
            tweet_type,
            total_pages: Math.ceil(result.total_tweets / limit)
        }
    })
}

export const getNewFeedsController = async (
    req: Request<ParamsDictionary, any, any, GetNewFeedsReqQuery>,
    res: Response
) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const limit = Number(req.query.limit)
    const page = Number(req.query.page)
    const result = await tweetService.getNewFeeds({ user_id, limit, page })

    return res.json({
        message: TWEETS_MESSAGES.GET_NEW_FEEDS_SUCCESSFULLY,
        result: {
            tweets: result.tweets,
            limit,
            page,
            total_pages: Math.ceil(result.total_tweets / limit)
        }
    })
}
