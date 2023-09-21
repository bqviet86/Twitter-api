import { ParamsDictionary, Query } from 'express-serve-static-core'

import { TweetAudience, TweetType } from '~/constants/enums'
import { Media } from '../Others'

export interface CreateTweetReqBody {
    type: TweetType
    audience: TweetAudience
    content: string
    parent_id: string | null //  chỉ null khi tweet gốc, không thì là tweet_id cha dạng string
    hashtags: string[] // tên của hashtag dạng ['javascript', 'reactjs']
    mentions: string[] // user_id[]
    medias: Media[]
}

export interface GetTweetReqParams extends ParamsDictionary {
    tweet_id: string
}

export interface GetTweetChildrenReqParams extends ParamsDictionary {
    tweet_id: string
}

export interface GetTweetChildrenReqQuery extends Query {
    limit: string
    page: string
    tweet_type: string
}
