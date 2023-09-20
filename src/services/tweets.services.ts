import { ObjectId, WithId } from 'mongodb'

import { CreateTweetReqBody } from '~/models/requests/Tweet.requests'
import Tweet from '~/models/schemas/Tweet.schema'
import Hashtag from '~/models/schemas/Hashtag.schema'
import databaseService from './database.services'

class TweetService {
    async checkAndCreateHashtag(hashtags: string[]) {
        const hashtagDocuments = await Promise.all(
            hashtags.map((hashtag) => {
                return databaseService.hashtags.findOneAndUpdate(
                    { name: hashtag },
                    {
                        $setOnInsert: new Hashtag({ name: hashtag })
                    },
                    {
                        upsert: true,
                        returnDocument: 'after'
                    }
                )
            })
        )
        const hashtagIds = hashtagDocuments.map((hashtagDocument) => {
            return (hashtagDocument.value as WithId<Hashtag>)._id
        })

        return hashtagIds
    }

    async createTweet(user_id: string, payload: CreateTweetReqBody) {
        const hashtags = await this.checkAndCreateHashtag(payload.hashtags)

        const result = await databaseService.tweets.insertOne(
            new Tweet({
                ...payload,
                user_id: new ObjectId(user_id),
                hashtags
            })
        )
        const tweet = await databaseService.tweets.findOne({ _id: result.insertedId })

        return tweet
    }

    async getTweet(tweet_id: string) {
        const tweet = await databaseService.tweets.findOne({ _id: new ObjectId(tweet_id) })

        return tweet
    }
}

const tweetService = new TweetService()

export default tweetService
