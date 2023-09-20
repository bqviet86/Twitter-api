import { Router } from 'express'

import {
    getVideoStatusController,
    uploadImageController,
    uploadVideoController,
    uploadVideoHLSController
} from '~/controllers/medias.controllers'
import { accessTokenValidator, verifiedUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const mediasRouter = Router()

/**
 * Description: Upload image
 * Path: /upload-image
 * Method: POST
 * Body: { image: max 4 files }
 */
mediasRouter.post(
    '/upload-image',
    accessTokenValidator,
    verifiedUserValidator,
    wrapRequestHandler(uploadImageController)
)

/**
 * Description: Upload video
 * Path: /upload-video
 * Method: POST
 * Body: { video: only 1 file }
 */
mediasRouter.post(
    '/upload-video',
    accessTokenValidator,
    verifiedUserValidator,
    wrapRequestHandler(uploadVideoController)
)

/**
 * Description: Upload video HLS
 * Path: /upload-video-hls
 * Method: POST
 * Body: { video: only 1 file }
 */
mediasRouter.post(
    '/upload-video-hls',
    accessTokenValidator,
    verifiedUserValidator,
    wrapRequestHandler(uploadVideoHLSController)
)

/**
 * Description: Get video status
 * Path: /video-status
 * Method: GET
 * Params: { id: string }
 */
mediasRouter.get(
    '/video-status/:id',
    accessTokenValidator,
    verifiedUserValidator,
    wrapRequestHandler(getVideoStatusController)
)

export default mediasRouter
