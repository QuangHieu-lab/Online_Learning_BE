const fs = require('fs');
const { getStorageBucket } = require('./firebase.service');
const { Readable } = require('stream');

const getFileExtension = (filename) => {
  const ext = filename.split('.').pop();
  return ext ? `.${ext}` : '';
};

/** Create a readable stream from multer file (buffer from memoryStorage or path from diskStorage). */
function createUploadStream(file) {
  if (file.buffer && Buffer.isBuffer(file.buffer)) {
    return Readable.from(file.buffer);
  }
  if (file.path && typeof file.path === 'string') {
    return fs.createReadStream(file.path);
  }
  throw new Error('File has neither buffer nor path');
}

const uploadFileToFirebase = async (file, folder = 'videos', customFileName) => {
  const inputStream = createUploadStream(file);
  const usedPath = !!file.path;

  try {
    const bucket = getStorageBucket();
    const fileName =
      customFileName ||
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${getFileExtension(file.originalname || '')}`;
    const filePath = `${folder}/${fileName}`;
    const fileRef = bucket.file(filePath);

    await new Promise((resolve, reject) => {
      const writeStream = fileRef.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
          },
        },
        public: true,
      });

      inputStream.pipe(writeStream);

      writeStream.on('error', (error) => {
        console.error('Upload error:', error);
        if (usedPath && typeof inputStream.destroy === 'function') inputStream.destroy();
        reject(error);
      });

      writeStream.on('finish', () => {
        if (usedPath && typeof inputStream.destroy === 'function') inputStream.destroy();
        resolve();
      });
    });

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

const deleteFileFromFirebase = async (filePath) => {
  try {
    const bucket = getStorageBucket();
    const fileRef = bucket.file(filePath);
    await fileRef.delete();
    console.log(`File deleted: ${filePath}`);
  } catch (error) {
    console.error('Error deleting file from Firebase Storage:', error);
  }
};

const getFileUrl = (filePath) => {
  const bucket = getStorageBucket();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
};

const getSignedUrl = async (filePath, expiresIn = 3600) => {
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

module.exports = {
  uploadFileToFirebase,
  deleteFileFromFirebase,
  getFileUrl,
  getSignedUrl,
};
