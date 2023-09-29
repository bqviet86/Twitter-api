import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import mime from 'mime'

import HTTP_STATUS from '~/constants/httpStatus'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { MEDIAS_MESSAGES } from '~/constants/messages'
import { getNameFromFilename } from '~/utils/file'
import { sendFileFromS3 } from '~/utils/s3'

export const serveImageController = (req: Request, res: Response) => {
    const { name } = req.params

    return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name), (err) => {
        if (err) {
            return res.status((err as any).status).send({
                message: MEDIAS_MESSAGES.IMAGE_NOT_FOUND
            })
        }
    })
}

export const serveVideoController = (req: Request, res: Response) => {
    const { name: filename } = req.params
    const dirName = getNameFromFilename(filename)

    return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, dirName, filename), (err) => {
        if (err) {
            return res.status((err as any).status).send({
                message: MEDIAS_MESSAGES.VIDEO_NOT_FOUND
            })
        }
    })
}

export const serveVideoStreamController = (req: Request, res: Response) => {
    const range = req.headers.range

    if (!range) {
        return res.status(HTTP_STATUS.BAD_REQUEST).send('Requires Range header')
    }

    const { name } = req.params
    const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name)
    const videoSize = fs.statSync(videoPath).size
    const chunkSize = 10 ** 6 // 1MB
    const start = Number(range.replace(/\D/g, ''))
    const end = Math.min(start + chunkSize, videoSize - 1)
    const contentLength = end - start + 1
    const contentType = mime.getType(videoPath) || 'video/*'
    const headers = {
        'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': contentType
    }
    const videoStream = fs.createReadStream(videoPath, { start, end })

    res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers)
    videoStream.pipe(res)
}

export const serveM3u8Controller = (req: Request, res: Response) => {
    const { id } = req.params

    sendFileFromS3(res, `videos-hls/${id}/master.m3u8`)

    // return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, 'master.m3u8'), (err) => {
    //     if (err) {
    //         return res.status((err as any).status).json({
    //             message: MEDIAS_MESSAGES.VIDEO_NOT_FOUND
    //         })
    //     }
    // })
}

export const serveSegmentController = (req: Request, res: Response) => {
    const { id, v, segment } = req.params

    sendFileFromS3(res, `videos-hls/${id}/${v}/${segment}`)

    // return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, v, segment), (err) => {
    //     if (err) {
    //         return res.status((err as any).status).json({
    //             message: MEDIAS_MESSAGES.VIDEO_NOT_FOUND
    //         })
    //     }
    // })
}
