import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/src/middlewares/schema'

import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await validation.run(req)

        const errors = validationResult(req)

        // Nếu không có lỗi thì next tới request handler
        if (errors.isEmpty()) {
            return next()
        }

        const errorsObject = errors.mapped()
        const entityError = new EntityError({ errors: {} })

        for (const key in errorsObject) {
            const { msg } = errorsObject[key]

            // Nếu có 1 lỗi status khác 422 thì next tới error handler với {message, status} của lỗi đó
            if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
                return next(msg)
            }

            entityError.errors[key] = errorsObject[key]
        }

        next(entityError)
    }
}
