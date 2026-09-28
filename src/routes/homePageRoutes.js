const express = require('express');
const router = express.Router();
const {
  getHomePageStructure,
  updateHomePageSections,
  updateSectionContent,
} = require('../controllers/homePageController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

router.get('/', getHomePageStructure);
router.put('/sections', protect, superAdminOnly, updateHomePageSections);
router.put('/sections/:sectionKey', protect, superAdminOnly, updateSectionContent);

module.exports = router;
