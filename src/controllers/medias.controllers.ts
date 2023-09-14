import { Request, Response } from 'express'

import mediaService from '~/services/medias.services'

export const uploadImageController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadImage(req)

    return res.json({
        message: 'Upload image successfully',
        result: data
    })
}

export const uploadVideoController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadVideo(req)

    return res.json({
        message: 'Upload video successfully',
        result: data
    })
}

export const uploadVideoHLSController = async (req: Request, res: Response) => {
    const data = await mediaService.uploadVideoHLS(req)

    return res.json({
        message: 'Upload video HLS successfully',
        result: data
    })
}

export const videoStatusController = async (req: Request, res: Response) => {}
