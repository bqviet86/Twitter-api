import { MediaTypes } from '~/constants/enums'
import { Media } from '~/models/Others'
import { numberEnumToArray } from './commons'

export const isMedia = (variable: any): variable is Media => {
    const mediaTypes = numberEnumToArray(MediaTypes)

    return (
        typeof variable === 'object' &&
        typeof variable.url === 'string' &&
        typeof variable.type === 'number' &&
        mediaTypes.includes(variable.type)
    )
}
