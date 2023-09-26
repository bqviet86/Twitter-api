import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

import { SEARCH_MESSAGES } from '~/constants/messages'
import { SearchReqQuery } from '~/models/requests/Search.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import searchService from '~/services/search.services'

export const searchController = async (req: Request<ParamsDictionary, any, any, SearchReqQuery>, res: Response) => {
    const { content } = req.query
    const media_type = req.query.media_type
    const limit = Number(req.query.limit)
    const page = Number(req.query.page)
    const { user_id } = req.decoded_authorization as TokenPayload
    const result = await searchService.search({ content, media_type, limit, page, user_id })

    return res.json({
        message: SEARCH_MESSAGES.SEARCH_SUCCESSFULLY,
        result: {
            tweets: result.tweets,
            limit,
            page,
            total_pages: Math.ceil(result.total_tweets / limit)
        }
    })
}
