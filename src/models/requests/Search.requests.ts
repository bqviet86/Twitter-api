import { Query } from 'express-serve-static-core'

import { MediaTypesQuery } from '~/constants/enums'

export interface SearchReqQuery extends Query {
    content: string
    media_type?: MediaTypesQuery
    people_follow: string
    limit: string
    page: string
}
