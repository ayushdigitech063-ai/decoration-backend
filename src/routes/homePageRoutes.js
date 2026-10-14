const express = require('express');
const router = express.Router();
const {
  getHomePageStructure,
  getSectionByKey,
  updateHomePageSections,
  updateSectionContent,
} = require('../controllers/homePageController');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

router.get('/', getHomePageStructure);
router.get('/sections/:sectionKey', getSectionByKey);
router.put('/sections', protect, adminOrSuperAdmin, updateHomePageSections);
router.put('/sections/:sectionKey', protect, adminOrSuperAdmin, updateSectionContent);

module.exports = router;
