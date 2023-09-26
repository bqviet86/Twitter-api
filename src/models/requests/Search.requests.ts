import { Query } from 'express-serve-static-core'

import { MediaTypesQuery, PeopleFollow } from '~/constants/enums'

export interface SearchReqQuery extends Query {
    content: string
    media_type?: MediaTypesQuery
    people_follow?: PeopleFollow
    limit: string
    page: string
}
