import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { CONFIG } from './config.js';

export class S3Service {
  static s3Client = null;
  static isConfigured = false;
  static lastCheckError = null;

  static getClient() {
    if (!this.s3Client) {
      try {
        const profile = process.env.AWS_PROFILE || 'postiz-dev';
        this.s3Client = new S3Client({
          region: CONFIG.AWS_REGION || 'ap-southeast-2',
          credentials: fromIni({ profile }),
        });
        this.isConfigured = true;
      } catch (err) {
        this.lastCheckError = err.message;
        console.warn('⚠️ S3 Client initialization warning:', err.message);
      }
    }
    return this.s3Client;
  }

  /**
   * Upload media buffer to S3 bucket
   * @returns {Promise<string|null>} Public HTTPS S3 URL or null on failure
   */
  static async uploadMedia(fileBuffer, originalFilename, mimeType) {
    const client = this.getClient();
    if (!client) return null;

    const ext = originalFilename.includes('.') ? originalFilename.split('.').pop() : 'jpg';
    const s3Key = `uploads/in2peta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    try {
      const command = new PutObjectCommand({
        Bucket: CONFIG.S3_BUCKET || 'in2peta-postiz-media',
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await client.send(command);

      const s3Url = `https://${CONFIG.S3_BUCKET || 'in2peta-postiz-media'}.s3.${CONFIG.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${s3Key}`;
      console.log(`☁️ Successfully uploaded media to AWS S3: ${s3Url}`);
      return s3Url;
    } catch (err) {
      this.lastCheckError = err.message;
      console.warn(`⚠️ S3 upload notice (${err.message}). Using tunnel storage.`);
      return null;
    }
  }

  /**
   * Check S3 credentials status
   */
  static async checkStatus() {
    try {
      const profile = process.env.AWS_PROFILE || 'postiz-dev';
      const credsProvider = fromIni({ profile });
      await credsProvider();
      return {
        connected: true,
        profile,
        role: 'arn:aws:iam::554599962875:role/PostizMediaUploadRole',
        bucket: CONFIG.S3_BUCKET || 'in2peta-postiz-media',
        region: CONFIG.AWS_REGION || 'ap-southeast-2',
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        profile: process.env.AWS_PROFILE || 'postiz-dev',
        role: 'arn:aws:iam::554599962875:role/PostizMediaUploadRole',
        bucket: CONFIG.S3_BUCKET || 'in2peta-postiz-media',
      };
    }
  }
}
