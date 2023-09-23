import { ObjectId } from 'mongodb'

import { MediaTypes, TweetAudience, TweetType } from '~/constants/enums'
import Hashtag from './schemas/Hashtag.schema'
import { UserLessData, UserWithoutSensitiveData } from './schemas/User.schema'

export interface Media {
    url: string
    type: MediaTypes
}

export interface TweetDetail {
    _id?: ObjectId
    user_id: ObjectId
    type: TweetType
    audience: TweetAudience
    content: string
    parent_id: ObjectId | null
    hashtags: Hashtag[]
    mentions: UserLessData[]
    medias: Media[]
    guest_views: number
    user_views: number
    created_at: Date
    updated_at: Date
    user: UserWithoutSensitiveData
    bookmarks: number
    likes: number
    retweet_count: number
    comment_count: number
    quotetweet_count: number
}
