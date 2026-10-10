// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();

const {
  getCategoryTree,
  getAllCategories,
  getCategoryByIdentifier,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// Middlewares
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/tree', getCategoryTree);

router.get('/', getAllCategories);


router.get('/:identifier', getCategoryByIdentifier);


router.post(
  '/',
  protect,
  adminOrSuperAdmin,
  upload.single('image'),
  createCategory
);

router.put(
  '/:id',
  protect,
  adminOrSuperAdmin,
  upload.single('image'),
  updateCategory
);

router.delete(
  '/:id',
  protect,
  adminOrSuperAdmin,
  deleteCategory
);

module.exports = router;