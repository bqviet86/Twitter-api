import { Request } from 'express'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

import { isProduction } from '~/constants/config'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { EncodingStatus, MediaTypes } from '~/constants/enums'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import { Media } from '~/models/Others'
import databaseService from './database.services'
import { getNameFromFilename, handleUploadImage, handleUploadVideo } from '~/utils/file'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'

class EncodeQueue {
    items: string[]
    isEncoding: boolean

    constructor() {
        this.items = []
        this.isEncoding = false
    }

    async enqueue(item: string) {
        const idName = getNameFromFilename(path.basename(item))

        this.items.push(item)
        await databaseService.videoStatus.insertOne(
            new VideoStatus({
                name: idName,
                status: EncodingStatus.Pending
            })
        )
        this.processEncode()
    }

    async processEncode() {
        if (this.isEncoding) return

        if (this.items.length > 0) {
            this.isEncoding = true

            const videoPath = this.items.shift() as string
            const idName = getNameFromFilename(path.basename(videoPath))

            await databaseService.videoStatus.updateOne(
                { name: idName },
                {
                    $set: {
                        status: EncodingStatus.Processing
                    },
                    $currentDate: {
                        updated_at: true
                    }
                }
            )

            try {
                await encodeHLSWithMultipleVideoStreams(videoPath)
                fs.unlinkSync(videoPath)
                await databaseService.videoStatus.updateOne(
                    { name: idName },
                    {
                        $set: {
                            status: EncodingStatus.Success
                        },
                        $currentDate: {
                            updated_at: true
                        }
                    }
                )

                console.log(`Encode video ${videoPath} success`)
            } catch (error) {
                await databaseService.videoStatus
                    .updateOne(
                        { name: idName },
                        {
                            $set: {
                                status: EncodingStatus.Failed
                            },
                            $currentDate: {
                                updated_at: true
                            }
                        }
                    )
                    .catch((err) => {
                        console.error(`Update status video failed`, err)
                    })

                console.error(`Encode video ${videoPath} failed`)
                console.error(error)
            }

            this.isEncoding = false
            this.processEncode()
        } else {
            console.log('Encode video queue is empty')
        }
    }
}

const encodeQueue = new EncodeQueue()

class MediaService {
    async uploadImage(req: Request) {
        const files = await handleUploadImage(req)

        const result: Media[] = await Promise.all(
            files.map(async (file) => {
                const newFilename = `${getNameFromFilename(file.newFilename)}.jpeg`
                const newFilepath = path.resolve(UPLOAD_IMAGE_DIR, newFilename)

                await sharp(file.filepath).jpeg({ quality: 50 }).toFile(newFilepath)
                fs.unlinkSync(file.filepath)

                return {
                    url: isProduction
                        ? `${process.env.HOST}/static/image/${newFilename}`
                        : `http://localhost:${process.env.PORT}/static/image/${newFilename}`,
                    type: MediaTypes.Image
                }
            })
        )

        return result
    }

    async uploadVideo(req: Request) {
        const files = await handleUploadVideo(req)
        const result: Media[] = files.map((file) => ({
            url: isProduction
                ? `${process.env.HOST}/static/video/${file.newFilename}`
                : `http://localhost:${process.env.PORT}/static/video/${file.newFilename}`,
            type: MediaTypes.Video
        }))

        return result
    }

    async uploadVideoHLS(req: Request) {
        const files = await handleUploadVideo(req)
        const result: Media[] = await Promise.all(
            files.map(async (file) => {
                const newFilename = getNameFromFilename(file.newFilename)

                encodeQueue.enqueue(file.filepath)

                return {
                    url: isProduction
                        ? `${process.env.HOST}/static/video-hls/${newFilename}/master.m3u8`
                        : `http://localhost:${process.env.PORT}/static/video-hls/${newFilename}/master.m3u8`,
                    type: MediaTypes.HLS
                }
            })
        )

        return result
    }
}

const mediaService = new MediaService()

export default mediaService
