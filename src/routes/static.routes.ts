import { Router } from 'express'

import {
    serveImageController,
    serveM3u8Controller,
    serveSegmentController,
    serveVideoController,
    serveVideoStreamController
} from '~/controllers/static.controllers'

const staticRouter = Router()

staticRouter.get('/image/:name', serveImageController)
staticRouter.get('/video/:name', serveVideoController)
staticRouter.get('/video-stream/:name', serveVideoStreamController)
staticRouter.get('/video-hls/:id/master.m3u8', serveM3u8Controller)
staticRouter.get('/video-hls/:id/:v/:segment', serveSegmentController)

export default staticRouter
