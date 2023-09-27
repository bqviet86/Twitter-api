import { checkSchema } from 'express-validator'

import { MediaTypesQuery, PeopleFollow } from '~/constants/enums'
import { SEARCH_MESSAGES } from '~/constants/messages'
import { stringEnumToArray } from '~/utils/commons'
import { validate } from '~/utils/validation'

const mediaTypesQueryValues = stringEnumToArray(MediaTypesQuery)
const peopleFollowValues = stringEnumToArray(PeopleFollow)

export const searchValidator = validate(
    checkSchema(
        {
            content: {
                isString: {
                    errorMessage: SEARCH_MESSAGES.CONTENT_MUST_BE_STRING
                }
            },
            media_type: {
                optional: true,
                isIn: {
                    options: [mediaTypesQueryValues]
                },
                errorMessage: SEARCH_MESSAGES.INVALID_MEDIA_TYPE
            },
            people_follow: {
                optional: true,
                isIn: {
                    options: [peopleFollowValues]
                },
                errorMessage: SEARCH_MESSAGES.INVALID_PEOPLE_FOLLOW
            }
        },
        ['query']
    )
)
