// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an in-memory buffer to Cloudinary via upload stream
 * @param {Buffer} fileBuffer
 * @param {String} folder
 * @returns {Promise<Object>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'party_square/categories') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};


const uploadMultipleToCloudinary = async (files, folder = 'party_square/products') => {
  // Edge case: agar koi file na ho ya array empty ho
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  // Har file ke buffer ko parallel upload ke liye map karo
  const uploadPromises = files.map((file) => {
    return uploadToCloudinary(file.buffer, folder)
      .then((result) => result.secure_url)
      .catch((err) => {
        // Individual error logging (optional)
        console.error(`Failed to upload ${file.originalname || 'file'}:`, err.message);
        throw err; // Ek bhi fail ho toh error throw karega taaki catch block handle kare
      });
  });

  // Saari images ek sath parallel stream hongi (Fastest approach)
  return Promise.all(uploadPromises);
};

/**
 * Delete a media asset from Cloudinary using its secure URL
 * @param {String} imageUrl
 * @returns {Promise<Object|null>}
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.includes('cloudinary.com')) {
      return null;
    }

    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // upload/ ke aage ka saara path le lo
    const pathParts = parts.slice(uploadIndex + 1);

    // Agar pehla element version tag hai (e.g. 'v1728551234'), use hata do
    if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].slice(1))) {
      pathParts.shift();
    }

    // Path join karo aur extension (.jpg, .webp, .png) strip karo
    const fullPath = pathParts.join('/');
    const publicId = fullPath.substring(0, fullPath.lastIndexOf('.'));

    if (publicId) {
      return await cloudinary.uploader.destroy(publicId);
    }

    return null;
  } catch (error) {
    console.error('Cloudinary asset destruction failure:', error.message);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
};