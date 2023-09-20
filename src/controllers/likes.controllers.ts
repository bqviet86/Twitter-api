import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

import { LIKE_MESSAGES } from '~/constants/messages'
import { LikeTweetReqBody, UnlikeTweetReqParams } from '~/models/requests/Like.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import likeService from '~/services/likes.services'

export const likeTweetController = async (req: Request<ParamsDictionary, any, LikeTweetReqBody>, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { tweet_id } = req.body
    const result = await likeService.likeTweet(user_id, tweet_id)

    return res.json({
        message: LIKE_MESSAGES.LIKE_SUCCESSFULLY,
        result
    })
}

export const unlikeTweetController = async (req: Request<UnlikeTweetReqParams>, res: Response) => {
    const { user_id } = req.decoded_authorization as TokenPayload
    const { tweet_id } = req.params
    const result = await likeService.unlikeTweet(user_id, tweet_id)

    return res.json(result)
}
