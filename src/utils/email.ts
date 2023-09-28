/* eslint-disable no-undef */
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses'
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

config()

// Create SES service object.
const sesClient = new SESClient({
    region: process.env.AWS_REGION as string,
    credentials: {
        secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET as string,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string
    }
})

const emailTemplate = fs.readFileSync(path.resolve('src/templates/verify-email.html'), 'utf-8')

const createSendEmailCommand = ({
    fromAddress,
    toAddresses,
    ccAddresses = [],
    body,
    subject,
    replyToAddresses = []
}: {
    fromAddress: string
    toAddresses: string | string[]
    ccAddresses?: string | string[]
    body: string
    subject: string
    replyToAddresses?: string | string[]
}) => {
    return new SendEmailCommand({
        Destination: {
            /* required */
            CcAddresses: ccAddresses instanceof Array ? ccAddresses : [ccAddresses],
            ToAddresses: toAddresses instanceof Array ? toAddresses : [toAddresses]
        },
        Message: {
            /* required */
            Body: {
                /* required */
                Html: {
                    Charset: 'UTF-8',
                    Data: body
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: fromAddress,
        ReplyToAddresses: replyToAddresses instanceof Array ? replyToAddresses : [replyToAddresses]
    })
}

export const sendVerifyEmail = (toAddress: string, subject: string, body: string) => {
    const sendEmailCommand = createSendEmailCommand({
        fromAddress: process.env.SES_FROM_ADDRESS as string,
        toAddresses: toAddress,
        body,
        subject
    })

    return sesClient.send(sendEmailCommand)
}

export const sendVerifyRegisterEmail = (
    toAddress: string,
    email_verify_token: string,
    template: string = emailTemplate
) => {
    return sendVerifyEmail(
        toAddress,
        'Verify email',
        template
            .replace('{{title}}', 'Verify your email')
            .replace('{{content}}', 'Click the button below to verify your email.')
            .replace('{{link}}', `${process.env.CLIENT_URL}/email-verifications?token=${email_verify_token}`)
            .replace('{{titleLink}}', 'Verify')
    )
}

export const sendForgotPasswordEmail = (
    toAddress: string,
    forgot_password_token: string,
    template: string = emailTemplate
) => {
    return sendVerifyEmail(
        toAddress,
        'Forgot Password',
        template
            .replace('{{title}}', 'You are receiving this email because you requested to reset your password')
            .replace('{{content}}', 'Click the button below to reset your password')
            .replace('{{link}}', `${process.env.CLIENT_URL}/forgot-password?token=${forgot_password_token}`)
            .replace('{{titleLink}}', 'Reset Password')
    )
}
