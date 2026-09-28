const Navigation = require('../models/Navigation');

// Default initial navigation structure
const defaultNavData = {
  topbar: [
    { title: 'Home', path: '/', order: 1, isVisible: true },
    { title: 'About Us', path: '/about', order: 2, isVisible: true },
    { title: 'Services', path: '/services', order: 3, isVisible: true },
    { title: 'Festivals', path: '/Festivals', order: 4, isVisible: true },
    { title: 'Gallery', path: '/gallery', order: 5, isVisible: true },
    { title: 'Contact', path: '/contact', order: 6, isVisible: true },
  ],
  sidebar: [
    {
      title: 'Home Sections',
      path: '/#sections',
      order: 1,
      isVisible: true,
      children: [
        { title: 'Hero Banner', path: '/#hero', order: 1, isVisible: true },
        { title: 'Most Loved Decor', path: '/MostLovedDecor', order: 2, isVisible: true },
        { title: 'Festivals & Events', path: '/Festivals', order: 3, isVisible: true },
        { title: 'Gallery Highlights', path: '/gallery', order: 4, isVisible: true },
        { title: 'Progress & Stats', path: '/PRogress', order: 5, isVisible: true },
        { title: 'Our Work', path: '/Work', order: 6, isVisible: true },
      ],
    },
    { title: 'Services Catalog', path: '/services', order: 2, isVisible: true },
    { title: 'Wishlist & Cart', path: '/wishlist', order: 3, isVisible: true },
    { title: 'Privacy Policy', path: '/privacy-Policy', order: 4, isVisible: true },
    { title: 'Terms & Conditions', path: '/terms-and-condition', order: 5, isVisible: true },
  ],
  admin_sidebar: [
    { title: 'Dashboard', path: '/admin', order: 1, isVisible: true },
    {
      title: 'Home Page Manager',
      path: '/admin/homepage',
      order: 2,
      isVisible: true,
      children: [
        { title: 'Hero Banner', path: '/admin/homepage/hero', order: 1, isVisible: true },
        { title: 'Most Loved Decor', path: '/admin/homepage/most-loved', order: 2, isVisible: true },
        { title: 'Festivals', path: '/admin/homepage/festivals', order: 3, isVisible: true },
        { title: 'Progress Section', path: '/admin/homepage/progress', order: 4, isVisible: true },
        { title: 'Work Section', path: '/admin/homepage/work', order: 5, isVisible: true },
      ],
    },
    { title: 'Topbar Manager', path: '/admin/navigation/topbar', order: 3, isVisible: true },
    { title: 'Sidebar Manager', path: '/admin/navigation/sidebar', order: 4, isVisible: true },
    { title: 'Services Manager', path: '/admin/services', order: 5, isVisible: true },
    { title: 'Bookings & Orders', path: '/admin/bookings', order: 6, isVisible: true },
    { title: 'User Management', path: '/admin/users', order: 7, isVisible: true },
  ],
};

// @desc    Get Navigation structure by type (topbar, sidebar, admin_sidebar)
// @route   GET /api/navigation/:type
// @access  Public
const getNavigation = async (req, res) => {
  const { type } = req.params;
  let nav = await Navigation.findOne({ type });

  // Seed default if not existing
  if (!nav && defaultNavData[type]) {
    nav = await Navigation.create({
      type,
      items: defaultNavData[type],
    });
  }

  res.json(nav || { type, items: [] });
};

// @desc    Update Topbar / Sidebar Navigation structure
// @route   PUT /api/navigation/:type
// @access  Private/SuperAdmin
const updateNavigation = async (req, res) => {
  const { type } = req.params;
  const { items } = req.body;

  let nav = await Navigation.findOne({ type });

  if (nav) {
    nav.items = items;
    await nav.save();
  } else {
    nav = await Navigation.create({ type, items });
  }

  res.json({ message: `${type} navigation updated successfully`, nav });
};

module.exports = {
  getNavigation,
  updateNavigation,
};
