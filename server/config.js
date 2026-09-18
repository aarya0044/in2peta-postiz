import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3005,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  POSTIZ_API_URL: process.env.POSTIZ_API_URL || 'http://localhost:4007/api/public/v1',
  POSTIZ_API_KEY: process.env.POSTIZ_API_KEY || '',
  S3_BUCKET: process.env.S3_BUCKET || 'in2peta-postiz-media',
  AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
};
