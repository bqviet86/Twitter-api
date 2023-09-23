import { checkSchema } from 'express-validator'

import { SEARCH_MESSAGES } from '~/constants/messages'
import { validate } from '~/utils/validation'

export const searchValidator = validate(
    checkSchema(
        {
            content: {
                isString: {
                    errorMessage: SEARCH_MESSAGES.CONTENT_MUST_BE_STRING
                }
            }
        },
        ['query']
    )
)
