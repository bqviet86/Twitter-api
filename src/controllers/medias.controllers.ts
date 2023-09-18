import { Request, Response } from 'express'

import { MEDIAS_MESSAGES } from '~/constants/messages'
import databaseService from '~/services/database.services'
import mediaService from '~/services/medias.services'

export const uploadImageController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadImage(req)

    return res.json({
        message: MEDIAS_MESSAGES.UPLOAD_IMAGE_SUCCESS,
        result: data
    })
}

export const uploadVideoController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadVideo(req)

    return res.json({
        message: MEDIAS_MESSAGES.UPLOAD_VIDEO_SUCCESS,
        result: data
    })
}

export const uploadVideoHLSController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadVideoHLS(req)

    return res.json({
        message: MEDIAS_MESSAGES.UPLOAD_VIDEO_HLS_SUCCESS,
        result: data
    })
}

export const getVideoStatusController = async (req: Request, res: Response) => {
    const { id } = req.query
    const result = await mediaService.getVideoStatus(id as string)

    return res.json({
        message: MEDIAS_MESSAGES.GET_VIDEO_STATUS_SUCCESS,
        result
    })
}

export const testController = async (req: Request, res: Response) => {
    await databaseService.refreshTokens.deleteMany({})

    return res.json({
        message: 'OK'
    })
}
