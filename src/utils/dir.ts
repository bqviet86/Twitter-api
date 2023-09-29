import fs, { RmDirOptions } from 'fs'

export const deleteFolder = (dirPath: string, options: RmDirOptions = { recursive: true }) => {
    return new Promise((resolve, reject) => {
        fs.rm(dirPath, options, (error) => {
            if (error) {
                return reject(error)
            }

            resolve(true)
        })
    })
}
