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

export enum MediaTypesQuery {
    Image = 'image',
    Video = 'video'
}

export enum EncodingStatus {
    Pending,
    Processing,
    Success,
    Failed
}

export enum TweetAudience {
    Everyone,
    TwitterCircle
}

export enum TweetType {
    Tweet,
    Retweet,
    Comment,
    QuoteTweet
}
