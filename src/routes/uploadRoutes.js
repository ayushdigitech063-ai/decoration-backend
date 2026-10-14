const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'u4bnc0pb',
  api_key: process.env.CLOUDINARY_API_KEY || '785873239169827',
  api_secret: process.env.CLOUDINARY_API_SECRET || '-LqLLSeq8ho_5OfQqzqGAc_vxQ4',
});

// Configure Multer (memory storage for buffer, up to 100MB for video)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// @desc    Upload an image or video to Cloudinary
// @route   POST /api/upload
// @access  Private/Admin/SuperAdmin
router.post('/', protect, adminOrSuperAdmin, upload.any(), async (req, res) => {
  try {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (!file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Determine resource_type based on mimetype
    const isVideo = file.mimetype && file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'auto';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'party_square',
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({
            message: error.message || 'Error uploading file to Cloudinary',
            error: error.message
          });
        }

        return res.json({
          message: `${isVideo ? 'Video' : 'File'} uploaded successfully`,
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          resource_type: result.resource_type,
          duration: result.duration,
        });
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Error processing upload', error: error.message });
  }
});

module.exports = router;
