// src/routes/cityRoutes.js
const express = require('express');
const router = express.Router();

const {
  getAllCities,
  getCityByIdentifier,
  createCity,
  updateCity,
  deleteCity,
} = require('../controllers/cityController');

// Middlewares
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


router.get('/', getAllCities);


router.get('/:identifier', getCityByIdentifier);


router.post(
  '/',
  protect,
  adminOrSuperAdmin,
  upload.single('icon'),
  createCity
);


router.put(
  '/:id',
  protect,
  adminOrSuperAdmin,
  upload.single('icon'),
  updateCity
);

router.delete(
  '/:id',
  protect,
  adminOrSuperAdmin,
  deleteCity
);

module.exports = router;