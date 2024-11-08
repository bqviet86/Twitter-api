import { ParamsDictionary } from 'express-serve-static-core'
import { JwtPayload } from 'jsonwebtoken'

import { TokenTypes, UserVerifyStatus } from '~/constants/enums'

export interface RegisterReqBody {
    name: string
    email: string
    password: string
    confirm_password: string
    date_of_birth: string
}

export interface LoginReqBody {
    email: string
    password: string
}

export interface LogoutReqBody {
    refresh_token: string
}

export interface TokenPayload extends JwtPayload {
    user_id: string
    verify: UserVerifyStatus
    token_type: TokenTypes
    iat: number
    exp: number
}

export interface VerifyEmailReqBody {
    email_verify_token: string
}

export interface ForgotPasswordReqBody {
    email: string
}

export interface VerifyForgotPasswordReqBody {
    forgot_password_token: string
}

export interface ResetPasswordReqBody {
    forgot_password_token: string
    password: string
    confirm_password: string
}

export interface RefreshTokenReqBody {
    refresh_token: string
}

export interface UpdateMeReqBody {
    name?: string
    date_of_birth?: string
    bio?: string
    location?: string
    website?: string
    username?: string
    avatar?: string
    cover_photo?: string
}

export interface GetProfileReqParams extends ParamsDictionary {
    username: string
}

export interface FollowReqBody {
    followed_user_id: string
}

export interface UnfollowReqParams extends ParamsDictionary {
    followed_user_id: string
}

export interface ChangePasswordReqBody {
    old_password: string
    password: string
    confirm_password: string
}
