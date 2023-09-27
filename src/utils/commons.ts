export const numberEnumToArray = (numberEnum: { [key: string]: string | number }) => {
    return Object.values(numberEnum).filter((value) => typeof value === 'number') as number[]
}

export const stringEnumToArray = (numberEnum: { [key: string]: string | number }) => {
    return Object.values(numberEnum).filter((value) => typeof value === 'string') as string[]
}
