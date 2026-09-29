const HomePage = require('../models/HomePage');

const defaultHomeSections = [
  { sectionKey: 'hero_banner', title: 'Hero Banner Section', subtitle: 'Main landing banner with CTA', order: 1, isEnabled: true },
  { sectionKey: 'most_loved_decor', title: 'Most Loved Decor', subtitle: 'Trending decoration packages', order: 2, isEnabled: true },
  { sectionKey: 'festivals', title: 'Festivals & Occasions', subtitle: 'Special festival decorations', order: 3, isEnabled: true },
  { sectionKey: 'services', title: 'Our Services', subtitle: 'Full range of party decoration services', order: 4, isEnabled: true },
  { sectionKey: 'progress', title: 'Progress & Achievements', subtitle: 'Events hosted and happy customers', order: 5, isEnabled: true },
  { sectionKey: 'work', title: 'Our Work / Portfolio', subtitle: 'Showcase of previous decor setups', order: 6, isEnabled: true },
  { sectionKey: 'gallery', title: 'Photo Gallery', subtitle: 'Event gallery images', order: 7, isEnabled: true },
];

// @desc    Get Home Page structure and sections
// @route   GET /api/homepage
// @access  Public
const getHomePageStructure = async (req, res) => {
  let homePage = await HomePage.findOne();
  if (!homePage) {
    homePage = await HomePage.create({
      title: 'Main Home Page Layout',
      sections: defaultHomeSections,
    });
  }
  res.json(homePage);
};

// @desc    Update Home Page layout sections (Super Admin)
// @route   PUT /api/homepage/sections
// @access  Private/SuperAdmin
const updateHomePageSections = async (req, res) => {
  const { sections } = req.body;
  let homePage = await HomePage.findOne();

  if (homePage) {
    homePage.sections = sections;
    await homePage.save();
  } else {
    homePage = await HomePage.create({
      title: 'Main Home Page Layout',
      sections,
    });
  }

  res.json({ message: 'Home page sections updated successfully', homePage });
};

// @desc    Update specific section content
// @route   PUT /api/homepage/sections/:sectionKey
// @access  Private/SuperAdmin
const updateSectionContent = async (req, res) => {
  const { sectionKey } = req.params;
  const { title, subtitle, isEnabled, order, contentData } = req.body;

  const homePage = await HomePage.findOne();
  if (!homePage) {
    return res.status(404).json({ message: 'Home page configuration not found' });
  }

  const sectionIndex = homePage.sections.findIndex((s) => s.sectionKey === sectionKey);
  
  if (sectionIndex === -1) {
    // If section doesn't exist, create it dynamically
    homePage.sections.push({
      sectionKey,
      title: title || sectionKey,
      subtitle: subtitle || '',
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      order: order !== undefined ? order : homePage.sections.length + 1,
      contentData: contentData || {}
    });
  } else {
    // Update existing section
    if (title !== undefined) homePage.sections[sectionIndex].title = title;
    if (subtitle !== undefined) homePage.sections[sectionIndex].subtitle = subtitle;
    if (isEnabled !== undefined) homePage.sections[sectionIndex].isEnabled = isEnabled;
    if (order !== undefined) homePage.sections[sectionIndex].order = order;
    if (contentData !== undefined) homePage.sections[sectionIndex].contentData = contentData;
  }

  await homePage.save();

  const updatedSection = homePage.sections.find(s => s.sectionKey === sectionKey);
  res.json({ message: `Section '${sectionKey}' updated successfully`, section: updatedSection });
};

module.exports = {
  getHomePageStructure,
  updateHomePageSections,
  updateSectionContent,
};
