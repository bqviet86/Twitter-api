import { Request } from 'express'
import fs from 'fs'
import path from 'path'
import formidable, { File } from 'formidable'
import { nanoid } from 'nanoid'

import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'

export const initFolder = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        })
    }
}

export const getNameFromFilename = (filename: string) => {
    const ext = path.extname(filename)

    return filename.replace(ext, '')
}

export const getExtensionFromFilename = (filename: string) => {
    const ext = path.extname(filename)

    return ext.slice(1)
}

export const handleUploadImage = (req: Request) => {
    const form = formidable({
        uploadDir: UPLOAD_IMAGE_TEMP_DIR,
        keepExtensions: true,
        maxFiles: 4,
        maxFileSize: 500 * 1024, // 500kb
        maxTotalFileSize: 500 * 1024 * 4, // 2mb
        filter: ({ name, originalFilename, mimetype }) => {
            const valid = name === 'image' && Boolean(mimetype?.includes('image'))

            if (!valid) {
                form.emit('error' as any, new Error('Invalid file type') as any)
            }

            return valid
        }
    })

    return new Promise<File[]>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(err)
            }

            if (!files.image) {
                return reject(new Error('No image provided'))
            }

            resolve(files.image)
        })
    })
}

export const handleUploadVideo = async (req: Request) => {
    const idName = nanoid()
    const uploadDir = path.resolve(UPLOAD_VIDEO_DIR, idName)

    initFolder(uploadDir)

    const form = formidable({
        uploadDir,
        maxFiles: 1,
        maxFileSize: 50 * 1024 * 1024, // 50mb
        filter: ({ name, originalFilename, mimetype }) => {
            const valid = name === 'video' && Boolean(mimetype?.includes('mp4') || mimetype?.includes('quicktime'))

            if (!valid) {
                form.emit('error' as any, new Error('Invalid file type') as any)
            }

            return valid
        },
        filename: () => idName
    })

    return new Promise<File[]>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                return reject(err)
            }

            if (!files.video) {
                return reject(new Error('No video provided'))
            }

            files.video.forEach((video) => {
                const ext = getExtensionFromFilename(video.originalFilename as string)

                fs.renameSync(video.filepath, `${video.filepath}.${ext}`)
                video.filepath = `${video.filepath}.${ext}`
                video.newFilename = `${video.newFilename}.${ext}`
            })

            resolve(files.video)
        })
    })
}

export const getFiles = (dir: string, files: string[] = []) => {
    const fileList = fs.readdirSync(dir)

    for (const file of fileList) {
        const name = `${dir}/${file}`

        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files)
        } else {
            files.push(name)
        }
    }

    return files
}
