import { Router } from 'express'

import { likeTweetController, unlikeTweetController } from '~/controllers/likes.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const likesRouter = Router()

/**
 * Description: Like a tweet
 * Path: /
 * Method: POST
 * Headers: { Authorization: Bearer <access_token> }
 * Body: LikeTweetReqBody
 */
likesRouter.post(
    '/',
    accessTokenValidator,
    verifiedUserValidator,
    tweetIdValidator,
    wrapRequestHandler(likeTweetController)
)

/**
 * Description: Unlike a tweet
 * Path: /tweets/:tweet_id
 * Method: DELETE
 * Headers: { Authorization: Bearer <access_token> }
 * Params: { tweet_id: string }
 */
likesRouter.delete(
    '/tweets/:tweet_id',
    accessTokenValidator,
    verifiedUserValidator,
    tweetIdValidator,
    wrapRequestHandler(unlikeTweetController)
)

export default likesRouter
