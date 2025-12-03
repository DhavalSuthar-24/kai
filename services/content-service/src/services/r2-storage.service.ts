import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@shared/index';

const logger = createLogger('r2-storage');

// CloudFlare R2 Configuration
const R2_ENABLED = process.env.R2_ENABLED === 'true';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kai-screenshots';

let s3Client: S3Client | null = null;

if (R2_ENABLED && R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  logger.info('R2 Storage initialized');
} else {
  logger.info('R2 Storage disabled - using local filesystem');
}

export interface UploadResult {
  url: string;
  key: string;
  storage: 'r2' | 'local';
}

export async function uploadFile(filePath: string, filename: string): Promise<UploadResult> {
  // If R2 is enabled and configured, upload to R2
  if (s3Client) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const key = `screenshots/${Date.now()}-${filename}`;

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: fileStream,
          ContentType: getContentType(filename),
        },
      });

      await upload.done();

      // Delete local file after successful upload
      fs.unlinkSync(filePath);

      logger.info(`File uploaded to R2: ${key}`);

      return {
        url: `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`,
        key,
        storage: 'r2'
      };
    } catch (error) {
      logger.error('R2 upload failed, falling back to local storage', error);
      // Fall through to local storage
    }
  }

  // Local storage fallback
  const localUrl = `/uploads/${path.basename(filePath)}`;
  return {
    url: localUrl,
    key: path.basename(filePath),
    storage: 'local'
  };
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return contentTypes[ext] || 'application/octet-stream';
}
