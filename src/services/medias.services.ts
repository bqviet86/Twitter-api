import { Request } from 'express'
import { CompleteMultipartUploadCommandOutput } from '@aws-sdk/client-s3'
import { config } from 'dotenv'
import fsPromise from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import mime from 'mime'

import { isProduction } from '~/constants/config'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { EncodingStatus, MediaTypes } from '~/constants/enums'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import { Media } from '~/models/Others'
import databaseService from './database.services'
import { getFiles, getNameFromFilename, handleUploadImage, handleUploadVideo } from '~/utils/file'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import { uploadToS3 } from '~/utils/s3'
import { deleteFolder } from '~/utils/dir'

config()

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
                await fsPromise.unlink(videoPath)

                const videoDirPath = path.resolve(UPLOAD_VIDEO_DIR, idName)
                const files = getFiles(videoDirPath)

                await Promise.all(
                    files.map((filepath) => {
                        // filepath: ___\server\uploads\videos\x5-rHadBNqy9ZySFBDO1E\v0\fileSequence0.ts
                        // relativePath: x5-rHadBNqy9ZySFBDO1E/v0/fileSequence0.ts
                        const relativePath = path.relative(UPLOAD_VIDEO_DIR, filepath).replace(/\\/g, '/')

                        return uploadToS3({
                            filename: `videos-hls/${relativePath}`,
                            filepath,
                            contentType: mime.getType(filepath) as string
                        })
                    })
                )

                await Promise.all([
                    deleteFolder(videoDirPath),
                    databaseService.videoStatus.updateOne(
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
                ])

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

                const s3Result = await uploadToS3({
                    filename: `images/${newFilename}`,
                    filepath: newFilepath,
                    contentType: mime.getType(newFilepath) as string
                })

                await Promise.all([fsPromise.unlink(file.filepath), fsPromise.unlink(newFilepath)])

                return {
                    url: (s3Result as CompleteMultipartUploadCommandOutput).Location as string,
                    type: MediaTypes.Image
                }

                // return {
                //     url: isProduction
                //         ? `${process.env.HOST}/static/image/${newFilename}`
                //         : `http://localhost:${process.env.PORT}/static/image/${newFilename}`,
                //     type: MediaTypes.Image
                // }
            })
        )

        return result
    }

    async uploadVideo(req: Request) {
        const files = await handleUploadVideo(req)
        const result: Media[] = await Promise.all(
            files.map(async (file) => {
                const videoDirPath = path.resolve(UPLOAD_VIDEO_DIR, getNameFromFilename(file.newFilename))
                const s3Result = await uploadToS3({
                    filename: `videos/${file.newFilename}`,
                    filepath: file.filepath,
                    contentType: mime.getType(file.filepath) as string
                })

                await deleteFolder(videoDirPath)

                return {
                    url: (s3Result as CompleteMultipartUploadCommandOutput).Location as string,
                    type: MediaTypes.Video
                }

                // return {
                //     url: isProduction
                //         ? `${process.env.HOST}/static/video/${file.newFilename}`
                //         : `http://localhost:${process.env.PORT}/static/video/${file.newFilename}`,
                //     type: MediaTypes.Video
                // }
            })
        )

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

    async getVideoStatus(id: string) {
        const data = await databaseService.videoStatus.findOne({ name: id })

        return data
    }
}

const mediaService = new MediaService()

export default mediaService
