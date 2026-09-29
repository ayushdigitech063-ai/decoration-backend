const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'u4bnc0pb',
  api_key: process.env.CLOUDINARY_API_KEY || '785873239169827',
  api_secret: process.env.CLOUDINARY_API_SECRET || '-LqLLSeq8ho_5OfQqzqGAc_vxQ4',
});

// Configure Multer (memory storage for buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @desc    Upload an image to Cloudinary
// @route   POST /api/upload
// @access  Private/SuperAdmin
router.post('/', protect, superAdminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Convert buffer to Base64 to upload to cloudinary directly
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'party_square',
      resource_type: 'auto',
    });

    res.json({
      message: 'Image uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    if (error.message && error.message.includes('Invalid Signature')) {
      return res.status(401).json({ 
        message: 'Cloudinary API Secret mismatch! Please check your API Key and Secret.', 
        error: error.message 
      });
    }
    res.status(500).json({ message: 'Error uploading image to Cloudinary', error: error.message });
  }
});

module.exports = router;
