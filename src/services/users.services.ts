import { ObjectId } from 'mongodb'
import axios from 'axios'
import { config } from 'dotenv'

import { TokenTypes, UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { RegisterReqBody, UpdateMeReqBody } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import Follower from '~/models/schemas/Follower.schema'
import { ErrorWithStatus } from '~/models/Errors'
import databaseService from './database.services'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'

config()

class UserService {
    private signAccessToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        return signToken({
            payload: {
                user_id,
                verify,
                token_type: TokenTypes.AccessToken
            },
            privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
            options: {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN
            }
        })
    }

    private signRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        return signToken({
            payload: {
                user_id,
                verify,
                token_type: TokenTypes.RefreshToken
            },
            privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
            options: {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN
            }
        })
    }

    private signAccessTokenAndRefreshToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        return Promise.all([this.signAccessToken({ user_id, verify }), this.signRefreshToken({ user_id, verify })])
    }

    private signEmailVerifyToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        return signToken({
            payload: {
                user_id,
                verify,
                token_type: TokenTypes.EmailVerifyToken
            },
            privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
            options: {
                expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN
            }
        })
    }

    private signForgotPasswordToken({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        return signToken({
            payload: {
                user_id,
                verify,
                token_type: TokenTypes.ForgotPasswordToken
            },
            privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
            options: {
                expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN
            }
        })
    }

    async checkEmailExist(email: string) {
        const user = await databaseService.users.findOne({ email })

        return Boolean(user)
    }

    async checkUsernameExist(username: string) {
        const user = await databaseService.users.findOne({ username })

        return Boolean(user)
    }

    async register(payload: RegisterReqBody) {
        const user_id = new ObjectId()
        const [email_verify_token, [access_token, refresh_token]] = await Promise.all([
            this.signEmailVerifyToken({
                user_id: user_id.toString(),
                verify: UserVerifyStatus.Unverified
            }),
            this.signAccessTokenAndRefreshToken({
                user_id: user_id.toString(),
                verify: UserVerifyStatus.Unverified
            })
        ])
        const result = await databaseService.users.insertOne(
            new User({
                ...payload,
                _id: user_id,
                password: hashPassword(payload.password),
                date_of_birth: new Date(payload.date_of_birth),
                email_verify_token,
                username: `user${user_id.toString()}`
            })
        )

        await databaseService.refreshTokens.insertOne(
            new RefreshToken({
                token: refresh_token,
                user_id: result.insertedId
            })
        )

        console.log(`email_verify_token: ${email_verify_token}`)

        return { access_token, refresh_token }
    }

    async login({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        const [access_token, refresh_token] = await this.signAccessTokenAndRefreshToken({ user_id, verify })

        await databaseService.refreshTokens.insertOne(
            new RefreshToken({
                token: refresh_token,
                user_id: new ObjectId(user_id)
            })
        )

        return { access_token, refresh_token }
    }

    async logout(refresh_token: string) {
        await databaseService.refreshTokens.deleteOne({ token: refresh_token })

        return { message: USERS_MESSAGES.LOGOUT_SUCCESS }
    }

    private async getOauthGoogleToken(code: string) {
        const body = {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code'
        }
        const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        return data as { access_token: string; id_token: string }
    }

    private async getOauthGoogleUserInfo(access_token: string, id_token: string) {
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            params: {
                access_token,
                alt: 'json'
            },
            headers: {
                Authorization: `Bearer ${id_token}`
            }
        })

        return data as {
            id: string
            email: string
            verified_email: boolean
            name: string
            given_name: string
            family_name: string
            picture: string
            locale: string
        }
    }

    async oauthGoogle(code: string) {
        const { access_token, id_token } = await this.getOauthGoogleToken(code)
        const userInfo = await this.getOauthGoogleUserInfo(access_token, id_token)
        const user = await databaseService.users.findOne({ email: userInfo.email })

        if (user) {
            // Có user rồi thì login
            const token = await this.login({ user_id: user._id.toString(), verify: user.verify })

            return { ...token, new_user: false, verify: user.verify }
        } else {
            // Chưa có user thì register
            const password = Math.random().toString(36).substring(2, 15)
            const token = await this.register({
                name: userInfo.name,
                email: userInfo.email,
                password,
                confirm_password: password,
                date_of_birth: new Date().toISOString()
            })

            return { ...token, new_user: true, verify: UserVerifyStatus.Unverified }
        }
    }

    async verifyEmail(user_id: string) {
        const [[access_token, refresh_token], _] = await Promise.all([
            this.signAccessTokenAndRefreshToken({ user_id, verify: UserVerifyStatus.Verified }),
            databaseService.users.updateOne(
                { _id: new ObjectId(user_id) },
                {
                    $set: {
                        email_verify_token: '',
                        verify: UserVerifyStatus.Verified
                    },
                    $currentDate: {
                        updated_at: true
                    }
                }
            )
        ])

        return { access_token, refresh_token }
    }

    async resendVerifyEmail(user_id: string) {
        const email_verify_token = await this.signEmailVerifyToken({ user_id, verify: UserVerifyStatus.Unverified })

        console.log(`Resend email_verify_token: ${email_verify_token}`)

        await databaseService.users.updateOne(
            { _id: new ObjectId(user_id) },
            {
                $set: {
                    email_verify_token
                },
                $currentDate: {
                    updated_at: true
                }
            }
        )

        return { message: USERS_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS }
    }

    async forgotPassword({ user_id, verify }: { user_id: string; verify: UserVerifyStatus }) {
        const forgot_password_token = await this.signForgotPasswordToken({ user_id, verify })

        await databaseService.users.updateOne(
            { _id: new ObjectId(user_id) },
            {
                $set: {
                    forgot_password_token
                },
                $currentDate: {
                    updated_at: true
                }
            }
        )

        console.log(`forgot_password_token: ${forgot_password_token}`)

        return { message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD }
    }

    async resetPassword(user_id: string, password: string) {
        await databaseService.users.updateOne(
            { _id: new ObjectId(user_id) },
            {
                $set: {
                    password: hashPassword(password),
                    forgot_password_token: ''
                },
                $currentDate: {
                    updated_at: true
                }
            }
        )

        return { message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS }
    }

    async refreshToken({
        user_id,
        verify,
        refresh_token
    }: {
        user_id: string
        verify: UserVerifyStatus
        refresh_token: string
    }) {
        const [[new_access_token, new_refresh_token], _] = await Promise.all([
            this.signAccessTokenAndRefreshToken({ user_id, verify }),
            databaseService.refreshTokens.deleteOne({ token: refresh_token })
        ])

        await databaseService.refreshTokens.insertOne(
            new RefreshToken({
                token: new_refresh_token,
                user_id: new ObjectId(user_id)
            })
        )

        return { access_token: new_access_token, refresh_token: new_refresh_token }
    }

    async getMe(user_id: string) {
        const user = await databaseService.users.findOne(
            { _id: new ObjectId(user_id) },
            {
                projection: {
                    password: 0,
                    email_verify_token: 0,
                    forgot_password_token: 0
                }
            }
        )

        return user
    }

    async updateMe(user_id: string, payload: UpdateMeReqBody) {
        const user = await databaseService.users.findOneAndUpdate(
            { _id: new ObjectId(user_id) },
            {
                $set: {
                    ...payload,
                    date_of_birth: new Date(payload.date_of_birth as string)
                },
                $currentDate: {
                    updated_at: true
                }
            },
            {
                returnDocument: 'after',
                projection: {
                    password: 0,
                    email_verify_token: 0,
                    forgot_password_token: 0
                }
            }
        )

        return user.value
    }

    async getProfile(username: string) {
        const user = await databaseService.users.findOne(
            { username },
            {
                projection: {
                    password: 0,
                    created_at: 0,
                    updated_at: 0,
                    email_verify_token: 0,
                    forgot_password_token: 0,
                    verify: 0
                }
            }
        )

        if (user === null) {
            throw new ErrorWithStatus({
                message: USERS_MESSAGES.USER_NOT_FOUND,
                status: HTTP_STATUS.NOT_FOUND
            })
        }

        return user
    }

    async follow(user_id: string, followed_user_id: string) {
        if (user_id === followed_user_id) {
            return { message: USERS_MESSAGES.CANNOT_FOLLOW_YOURSELF }
        }

        const follower = await databaseService.followers.findOne({
            user_id: new ObjectId(user_id),
            followed_user_id: new ObjectId(followed_user_id)
        })

        if (follower === null) {
            await databaseService.followers.insertOne(
                new Follower({
                    user_id: new ObjectId(user_id),
                    followed_user_id: new ObjectId(followed_user_id)
                })
            )

            return { message: USERS_MESSAGES.FOLLOW_SUCCESS }
        }

        return { message: USERS_MESSAGES.FOLLOWED_BEFORE }
    }

    async unfollow(user_id: string, followed_user_id: string) {
        if (user_id === followed_user_id) {
            return { message: USERS_MESSAGES.CANNOT_UNFOLLOW_YOURSELF }
        }

        const follower = await databaseService.followers.findOne({
            user_id: new ObjectId(user_id),
            followed_user_id: new ObjectId(followed_user_id)
        })

        // Chưa follow mà unfollow
        if (follower === null) {
            return { message: USERS_MESSAGES.UNFOLLOWED_BEFORE }
        }

        // Đã follow rồi thì unfollow
        await databaseService.followers.deleteOne({
            user_id: new ObjectId(user_id),
            followed_user_id: new ObjectId(followed_user_id)
        })

        return { message: USERS_MESSAGES.UNFOLLOW_SUCCESS }
    }

    async changePassword(user_id: string, new_password: string) {
        await databaseService.users.updateOne(
            { _id: new ObjectId(user_id) },
            {
                $set: {
                    password: hashPassword(new_password)
                },
                $currentDate: {
                    updated_at: true
                }
            }
        )

        return { message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS }
    }
}

const userService = new UserService()

export default userService
