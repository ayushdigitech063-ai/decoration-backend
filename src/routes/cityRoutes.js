const express = require('express');
const router = express.Router();
const City = require('../models/City');
const { protect, adminOrSuperAdmin } = require('../middleware/authMiddleware');

const DEFAULT_CITIES = [
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Ahmedabad",
  "Faridabad",
  "Ghaziabad",
  "Gurugram",
  "Jaipur",
  "Kolkata",
  "Lucknow",
  "Mangalore",
  "Mysore",
  "Noida",
  "Pune",
  "Thane",
];

const mongoose = require('mongoose');

// Helper: Seed default cities if database has none or backfill slugs
const seedDefaultCitiesIfNeeded = async () => {
  const count = await City.countDocuments();
  if (count === 0) {
    const docs = DEFAULT_CITIES.map((name, index) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      isActive: true,
      isPopular: index < 6,
      order: index,
    }));
    await City.insertMany(docs);
  } else {
    // Backfill any existing cities missing a slug
    const missingSlugs = await City.find({ $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] });
    for (const doc of missingSlugs) {
      doc.slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await doc.save();
    }
  }
};

// GET /api/cities - Public endpoint (returns active cities sorted by order, or all if query ?all=true for admin)
router.get('/', async (req, res) => {
  try {
    await seedDefaultCitiesIfNeeded();
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const cities = await City.find(filter).sort({ order: 1, name: 1 });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/cities/:idOrSlug - Get single city details by slug, name, or id (Public)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let city = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      city = await City.findById(idOrSlug);
    }
    if (!city) {
      city = await City.findOne({ slug: idOrSlug.toLowerCase() });
    }
    if (!city) {
      city = await City.findOne({ name: { $regex: new RegExp(`^${idOrSlug}$`, 'i') } });
    }

    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    res.json(city);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/cities - Super Admin / Admin creates a new city
router.post('/', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      state,
      icon,
      isActive,
      isPopular,
      order,
      metaTitle,
      metaDescription,
      keywords,
      heading,
      subheading,
      content,
      serviceAreas,
      faqs,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'City name is required' });
    }

    const trimmedName = name.trim();
    const existing = await City.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ message: `City "${trimmedName}" already exists` });
    }

    const generatedSlug = slug && slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newCity = new City({
      name: trimmedName,
      slug: generatedSlug,
      state: state ? state.trim() : '',
      icon: icon || '',
      isActive: isActive !== undefined ? isActive : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      order: order !== undefined ? Number(order) : 0,
      metaTitle: metaTitle ? metaTitle.trim() : '',
      metaDescription: metaDescription ? metaDescription.trim() : '',
      keywords: Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string'
        ? keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [],
      heading: heading ? heading.trim() : '',
      subheading: subheading ? subheading.trim() : '',
      content: content ? content.trim() : '',
      customSchema: customSchema ? customSchema.trim() : '',
      serviceAreas: Array.isArray(serviceAreas)
        ? serviceAreas
        : typeof serviceAreas === 'string'
        ? serviceAreas.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      faqs: Array.isArray(faqs) ? faqs.filter((f) => f && f.question && f.question.trim()) : [],
    });

    const saved = await newCity.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/cities/:id - Super Admin / Admin updates city details (including SEO & FAQs)
router.put('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      slug,
      state,
      icon,
      isActive,
      isPopular,
      order,
      metaTitle,
      metaDescription,
      keywords,
      heading,
      subheading,
      content,
      serviceAreas,
      faqs,
    } = req.body;

    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await City.findOne({
        _id: { $ne: city._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({ message: `City "${trimmedName}" already exists` });
      }
      city.name = trimmedName;
    }

    if (slug !== undefined) {
      city.slug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    } else if (!city.slug && city.name) {
      city.slug = city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    if (state !== undefined) city.state = state.trim();
    if (icon !== undefined) city.icon = icon;
    if (isActive !== undefined) city.isActive = Boolean(isActive);
    if (isPopular !== undefined) city.isPopular = Boolean(isPopular);
    if (order !== undefined) city.order = Number(order);

    // SEO updates
    if (metaTitle !== undefined) city.metaTitle = metaTitle.trim();
    if (metaDescription !== undefined) city.metaDescription = metaDescription.trim();
    if (keywords !== undefined) {
      city.keywords = Array.isArray(keywords)
        ? keywords
        : typeof keywords === 'string'
        ? keywords.split(',').map((k) => k.trim()).filter(Boolean)
        : [];
    }

    // Content & Headings
    if (heading !== undefined) city.heading = heading.trim();
    if (subheading !== undefined) city.subheading = subheading.trim();
    if (content !== undefined) city.content = content.trim();

    // Service Areas
    if (serviceAreas !== undefined) {
      city.serviceAreas = Array.isArray(serviceAreas)
        ? serviceAreas
        : typeof serviceAreas === 'string'
        ? serviceAreas.split(',').map((a) => a.trim()).filter(Boolean)
        : [];
    }

    // FAQs
    if (customSchema !== undefined) city.customSchema = customSchema.trim();
    if (faqs !== undefined) {
      city.faqs = Array.isArray(faqs)
        ? faqs.filter((f) => f && f.question && f.question.trim())
        : [];
    }

    const updated = await city.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/cities/:id - Super Admin / Admin deletes a city
router.delete('/:id', protect, adminOrSuperAdmin, async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    res.json({ message: 'City deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
