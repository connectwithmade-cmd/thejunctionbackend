import dotenv from 'dotenv';
dotenv.config();


const config = {
    baseUrl: process.env.APP_BASE_UL,
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    aws: {
        s3AccessKey: process.env.AWS_S3_ACCESS_KEY,
        s3Secret: process.env.AWS_S3_SECRET,
        s3Bucket: process.env.AWS_S3_BUCKET,
        s3Region: process.env.AWS_S3_REGION,
    }
};

export default config;
  