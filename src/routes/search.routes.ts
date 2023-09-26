import { Router } from 'express'

import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middlewares'
import { paginationValidator } from '~/middlewares/tweets.middlewares'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const searchRouter = Router()

/**
 * Description: Search for tweets
 * Path: /
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Query: { content: string, media_type: MediaTypesQuery, people_follow: boolean, limit: number, page: number }
 */
searchRouter.get(
    '/',
    accessTokenValidator,
    verifiedUserValidator,
    searchValidator,
    paginationValidator,
    wrapRequestHandler(searchController)
)

export default searchRouter
