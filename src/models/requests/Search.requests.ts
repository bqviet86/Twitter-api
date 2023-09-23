import { Query } from 'express-serve-static-core'

export interface SearchReqQuery extends Query {
    content: string
    media_type: string
    people_follow: string
    limit: string
    page: string
}
