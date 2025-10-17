import AWS from 'aws-sdk';
import config from '../../config/config.js';

class FileUploadService {
  constructor() {
    AWS.config.update({
      accessKeyId: config.aws.s3AccessKey,
      secretAccessKey: config.aws.s3Secret,
      region: config.aws.s3Region,
    });

    this.s3 = new AWS.S3();
  }

  async uploadToS3(fileBuffer, fileName, mimeType) {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    };

    return this.s3.upload(params).promise();
  }

  async deleteFromS3(fileUrl) {
  if (!fileUrl) return;
  const key = fileUrl.split('.amazonaws.com/')[1];
  const params = {
    Bucket: config.aws.s3Bucket,
    Key: key,
  };
  return this.s3.deleteObject(params).promise();
}

}

export default new FileUploadService();
