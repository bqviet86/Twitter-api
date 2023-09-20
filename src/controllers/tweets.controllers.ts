import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { TWEETS_MESSAGES } from '~/constants/messages'

import { CreateTweetReqBody, GetTweetReqParams } from '~/models/requests/Tweet.requests'
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
    const result = req.tweet as Tweet

    return res.json({
        message: TWEETS_MESSAGES.GET_TWEET_SUCCESSFULLY,
        result
    })
}
