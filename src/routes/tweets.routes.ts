import { Router } from 'express'

import {
    createTweetController,
    getNewFeedsController,
    getTweetChildrenController,
    getTweetController
} from '~/controllers/tweets.controllers'
import {
    audienceValidator,
    createTweetValidator,
    getTweetChildrenValidator,
    paginationValidator,
    tweetIdValidator
} from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, isUserLoggedInValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const tweetsRouter = Router()

/**
 * Description: Create a tweet
 * Path: /
 * Method: POST
 * Headers: { Authorization: Bearer <access_token> }
 * Body: CreateTweetReqBody
 */
tweetsRouter.post(
    '/',
    accessTokenValidator,
    verifiedUserValidator,
    createTweetValidator,
    wrapRequestHandler(createTweetController)
)

/**
 * Description: Get a tweet
 * Path: /:tweet_id
 * Method: GET
 * Headers: { Authorization: Bearer <access_token> } (optional)
 * Params: { tweet_id: string }
 */
tweetsRouter.get(
    '/:tweet_id',
    tweetIdValidator,
    isUserLoggedInValidator(accessTokenValidator),
    isUserLoggedInValidator(verifiedUserValidator),
    wrapRequestHandler(audienceValidator),
    wrapRequestHandler(getTweetController)
)

/**
 * Description: Get children of a tweet
 * Path: /:tweet_id/children
 * Method: GET
 * Headers: { Authorization: Bearer <access_token> } (optional)
 * Params: { tweet_id: string }
 * Query: { limit: number, page: number, tweet_type: TweetType }
 */
tweetsRouter.get(
    '/:tweet_id/children',
    tweetIdValidator,
    paginationValidator,
    getTweetChildrenValidator,
    isUserLoggedInValidator(accessTokenValidator),
    isUserLoggedInValidator(verifiedUserValidator),
    wrapRequestHandler(audienceValidator),
    wrapRequestHandler(getTweetChildrenController)
)

/**
 * Description: Get new feeds
 * Path: /new-feeds
 * Method: GET
 * Headers: { Authorization: Bearer <access_token> }
 * Query: { limit: number, page: number }
 */
tweetsRouter.get(
    '/',
    paginationValidator,
    accessTokenValidator,
    verifiedUserValidator,
    wrapRequestHandler(getNewFeedsController)
)

export default tweetsRouter
