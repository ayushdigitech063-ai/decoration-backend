// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();

// Controllers
const {
  getAllProducts,
  getProductByIdentifier,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Middlewares
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


const productMediaUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 },
]);

router.get('/', getAllProducts);

router.get('/:identifier', getProductByIdentifier);

router.post(
  '/',
  protect,
  adminOrSuperAdmin,
  productMediaUpload,
  createProduct
);


router.put(
  '/:id',
  protect,
  adminOrSuperAdmin,
  productMediaUpload,
  updateProduct
);

router.delete(
  '/:id',
  protect,
  adminOrSuperAdmin,
  deleteProduct
);

module.exports = router;
