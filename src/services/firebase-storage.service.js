import { getStorageBucket } from './firebase.service.js';
import { Readable } from 'stream';

/**
 * Upload file to Firebase Storage
 */
export const uploadFileToFirebase = async (file, folder = 'videos', customFileName) => {
  try {
    const bucket = getStorageBucket();
    const fileName = customFileName || `${Date.now()}-${Math.round(Math.random() * 1e9)}${getFileExtension(file.originalname)}`;
    const filePath = `${folder}/${fileName}`;
    const fileRef = bucket.file(filePath);

    // Convert buffer to stream
    const stream = Readable.from(file.buffer);

    // Upload file
    await new Promise((resolve, reject) => {
      const writeStream = fileRef.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
          },
        },
        public: true, // Make file publicly accessible
      });

      stream.pipe(writeStream);

      writeStream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      writeStream.on('finish', () => {
        resolve();
      });
    });

    // Get public URL
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;

    return {
      url,
      path: filePath,
      bucket: bucket.name || '',
    };
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    throw error;
  }
};

/**
 * Delete file from Firebase Storage
 */
export const deleteFileFromFirebase = async (filePath) => {
  try {
    const bucket = getStorageBucket();
    const fileRef = bucket.file(filePath);
    await fileRef.delete();
    console.log(`File deleted: ${filePath}`);
  } catch (error) {
    console.error('Error deleting file from Firebase Storage:', error);
    // Don't throw - file might not exist
  }
};

/**
 * Get public URL for a file
 */
export const getFileUrl = (filePath) => {
  const bucket = getStorageBucket();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
};

/**
 * Get signed URL (temporary access)
 */
export const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const bucket = getStorageBucket();
    const fileRef = bucket.file(filePath);
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Helper to get file extension
 */
const getFileExtension = (filename) => {
  const ext = filename.split('.').pop();
  return ext ? `.${ext}` : '';
};
