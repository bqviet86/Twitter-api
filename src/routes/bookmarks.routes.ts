import { Router } from 'express'

import { bookmarkTweetController, unbookmarkTweetController } from '~/controllers/bookmarks.controllers'
import { tweetIdValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const bookmarksRouter = Router()

/**
 * Description: Bookmark a tweet
 * Path: /
 * Method: POST
 * Headers: { Authorization: Bearer <access_token> }
 * Body: BookmarkTweetReqBody
 */
bookmarksRouter.post(
    '/',
    accessTokenValidator,
    verifiedUserValidator,
    tweetIdValidator,
    wrapRequestHandler(bookmarkTweetController)
)

/**
 * Description: Unbookmark a tweet
 * Path: /tweets/:tweet_id
 * Method: DELETE
 * Headers: { Authorization: Bearer <access_token> }
 * Params: { tweet_id: string }
 */
bookmarksRouter.delete(
    '/tweets/:tweet_id',
    accessTokenValidator,
    verifiedUserValidator,
    tweetIdValidator,
    wrapRequestHandler(unbookmarkTweetController)
)

export default bookmarksRouter
