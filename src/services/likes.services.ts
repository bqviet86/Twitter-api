import { ObjectId, WithId } from 'mongodb'

import { LIKE_MESSAGES } from '~/constants/messages'
import Like from '~/models/schemas/Like.schema'
import databaseService from './database.services'

class LikeService {
    async likeTweet(user_id: string, tweet_id: string) {
        const userId = new ObjectId(user_id)
        const tweetId = new ObjectId(tweet_id)
        const result = await databaseService.likes.findOneAndUpdate(
            {
                user_id: userId,
                tweet_id: tweetId
            },
            {
                $setOnInsert: new Like({
                    user_id: userId,
                    tweet_id: tweetId
                })
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        )

        return result.value as WithId<Like>
    }

    async unlikeTweet(user_id: string, tweet_id: string) {
        await databaseService.likes.findOneAndDelete({
            user_id: new ObjectId(user_id),
            tweet_id: new ObjectId(tweet_id)
        })

        return { message: LIKE_MESSAGES.UNLIKE_SUCCESSFULLY }
    }
}

const likeService = new LikeService()

export default likeService
