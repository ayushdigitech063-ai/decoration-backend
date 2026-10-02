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
router.put('/sections/:sectionKey', protect, (req, res, next) => {
  // Allow logged-in customers to submit reviews to testimonials section
  if (req.params.sectionKey === 'testimonials') {
    return next();
  }
  return superAdminOnly(req, res, next);
}, updateSectionContent);

module.exports = router;
