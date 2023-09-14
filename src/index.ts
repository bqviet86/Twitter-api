import express from 'express'
import { config } from 'dotenv'
import cors from 'cors'

import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_TEMP_DIR } from './constants/dir'
import { defaultErrorHandler } from '~/middlewares/error.middlewares'
import usersRouter from '~/routes/users.routes'
import mediasRouter from '~/routes/medias.routes'
import staticRouter from '~/routes/static.routes'
import databaseService from '~/services/database.services'
import { initFolder } from '~/utils/file'

config()

const port = process.env.PORT || 4000
const app = express()

initFolder(UPLOAD_IMAGE_TEMP_DIR)
initFolder(UPLOAD_VIDEO_TEMP_DIR)

// Connect to database
databaseService.connect()

// Middlewares
app.use(express.json())
app.use(cors())

// Routes
app.use('/users', usersRouter)
app.use('/medias', mediasRouter)
app.use('/static', staticRouter)

// Error handler
app.use(defaultErrorHandler)

app.listen(port, () => console.log(`Listen on http://localhost:${port}`))
