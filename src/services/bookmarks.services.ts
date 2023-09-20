import { ObjectId, WithId } from 'mongodb'

import { BOOKMARK_MESSAGES } from '~/constants/messages'
import Bookmark from '~/models/schemas/Bookmark.schema'
import databaseService from './database.services'

class BookmarkService {
    async bookmarkTweet(user_id: string, tweet_id: string) {
        const userId = new ObjectId(user_id)
        const tweetId = new ObjectId(tweet_id)
        const result = await databaseService.bookmarks.findOneAndUpdate(
            {
                user_id: userId,
                tweet_id: tweetId
            },
            {
                $setOnInsert: new Bookmark({
                    user_id: userId,
                    tweet_id: tweetId
                })
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        )

        return result.value as WithId<Bookmark>
    }

    async unbookmarkTweet(user_id: string, tweet_id: string) {
        await databaseService.bookmarks.findOneAndDelete({
            user_id: new ObjectId(user_id),
            tweet_id: new ObjectId(tweet_id)
        })

        return { message: BOOKMARK_MESSAGES.UNBOOKMARK_SUCCESSFULLY }
    }
}

const bookmarkService = new BookmarkService()

export default bookmarkService
