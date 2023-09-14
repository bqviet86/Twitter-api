export enum UserVerifyStatus {
    Unverified,
    Verified,
    Banned
}

export enum TokenTypes {
    AccessToken,
    RefreshToken,
    ForgotPasswordToken,
    EmailVerifyToken
}

export enum MediaTypes {
    Image,
    Video,
    HLS
}

export enum EncodingStatus {
    Pending,
    Processing,
    Success,
    Failed
}
