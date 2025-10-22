import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  console.warn("⚠️ Cloudflare R2 credentials not configured");
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID || "",
    secretAccessKey: SECRET_ACCESS_KEY || "",
  },
});

export interface UploadPhotoResult {
  url: string;
  key: string;
}

/**
 * Upload a photo to Cloudflare R2
 * @param file - File buffer
 * @param fileName - File name
 * @param userId - User ID for organizing files
 * @param contentType - MIME type of the file
 * @returns The public URL and key of the uploaded file
 */
export async function uploadPhotoToR2(
  file: Buffer,
  fileName: string,
  userId: string,
  contentType: string
): Promise<UploadPhotoResult> {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured. Please add R2 credentials to .env");
  }

  // Generate unique file key
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `user-photos/${userId}/${timestamp}-${sanitizedFileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    });

    await r2Client.send(command);

    // Construct public URL
    const url = PUBLIC_URL
      ? `${PUBLIC_URL}/${key}`
      : `https://pub-${ACCOUNT_ID}.r2.dev/${key}`;

    console.log(`✅ Photo uploaded to R2: ${url}`);

    return { url, key };
  } catch (error) {
    console.error("❌ Failed to upload photo to R2:", error);
    throw new Error("Failed to upload photo");
  }
}

/**
 * Upload a message attachment (image) to Cloudflare R2
 * @param file - File buffer
 * @param fileName - File name
 * @param conversationId - Conversation ID for organizing files
 * @param userId - User ID who uploaded the file
 * @param contentType - MIME type of the file
 * @returns The public URL and key of the uploaded file
 */
export async function uploadMessageAttachmentToR2(
  file: Buffer,
  fileName: string,
  conversationId: string,
  userId: string,
  contentType: string
): Promise<UploadPhotoResult> {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error("Cloudflare R2 is not configured. Please add R2 credentials to .env");
  }

  // Generate unique file key
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `message-attachments/${conversationId}/${timestamp}-${sanitizedFileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    });

    await r2Client.send(command);

    // Construct public URL
    const url = PUBLIC_URL
      ? `${PUBLIC_URL}/${key}`
      : `https://pub-${ACCOUNT_ID}.r2.dev/${key}`;

    console.log(`✅ Message attachment uploaded to R2: ${url}`);

    return { url, key };
  } catch (error) {
    console.error("❌ Failed to upload message attachment to R2:", error);
    throw new Error("Failed to upload attachment");
  }
}

/**
 * Delete a photo from Cloudflare R2
 * @param key - The R2 object key to delete
 */
export async function deletePhotoFromR2(key: string): Promise<void> {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
    console.warn("⚠️ Cloudflare R2 is not configured, skipping deletion");
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log(`✅ Photo deleted from R2: ${key}`);
  } catch (error) {
    console.error("❌ Failed to delete photo from R2:", error);
    throw new Error("Failed to delete photo");
  }
}

/**
 * Extract R2 key from URL
 * @param url - Full R2 URL
 * @returns The object key
 */
export function extractR2KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // Remove leading empty string from split
    const key = pathParts.slice(1).join("/");
    return key || null;
  } catch {
    return null;
  }
}
