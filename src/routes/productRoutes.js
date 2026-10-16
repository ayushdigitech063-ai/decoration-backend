const express = require('express');
const mongoose = require('mongoose');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const Category = require('../models/Category');

const router = express.Router();

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// GET all products with server-side search, filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    const query = {};

    // 1. Text search
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { sku: searchRegex }
      ];
    }

    // 2. Category filter (by ID, slug, or name with child & related category support)
    if (req.query.category && req.query.category !== 'all') {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) {
        const childCats = await Category.find({ parentCategory: req.query.category }, '_id');
        if (childCats.length > 0) {
          const catIds = [req.query.category, ...childCats.map(c => c._id)];
          query.$and = query.$and || [];
          query.$and.push({
            $or: [{ category: { $in: catIds } }, { subcategory: { $in: catIds } }]
          });
        } else {
          query.category = req.query.category;
        }
      } else {
        const catSlug = req.query.category.toLowerCase().trim();
        const cat = await Category.findOne({
          $or: [
            { slug: catSlug },
            { name: new RegExp(`^${req.query.category.trim()}$`, 'i') },
          ],
        });
        if (cat) {
          const childCats = await Category.find({ parentCategory: cat._id }, '_id');
          let additionalCats = [];
          if (catSlug.includes('festiv')) {
            additionalCats = await Category.find({
              $or: [
                { name: /festiv|lohri|diwali|ganesh|navratri|christmas|janmashtami|independence/i },
                { slug: /festiv|lohri|diwali|ganesh|navratri|christmas|janmashtami|independence/i }
              ]
            }, '_id');
          }
          const allTargetIds = Array.from(new Set([
            String(cat._id),
            ...childCats.map(c => String(c._id)),
            ...additionalCats.map(c => String(c._id))
          ])).map(id => new mongoose.Types.ObjectId(id));

          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { category: { $in: allTargetIds } },
              { subcategory: { $in: allTargetIds } }
            ]
          });
        }
      }
    }

    // 3. Subcategory filter (by ID, slug, or name)
    if (req.query.subcategory && req.query.subcategory !== 'all') {
      if (mongoose.Types.ObjectId.isValid(req.query.subcategory)) {
        query.subcategory = req.query.subcategory;
      } else {
        const subcat = await Category.findOne({
          $or: [
            { slug: req.query.subcategory.toLowerCase().trim() },
            { name: new RegExp(`^${req.query.subcategory.trim()}$`, 'i') },
          ],
        });
        if (subcat) query.subcategory = subcat._id;
      }
    }

    // 4. Status / Availability filter
    if (req.query.status !== undefined && req.query.status !== 'all') {
      if (req.query.status === 'active' || req.query.status === 'true') {
        query.availability = true;
      } else if (req.query.status === 'inactive' || req.query.status === 'false') {
        query.availability = false;
      }
    }

    // 5. Price range filter
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.price = {};
      if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
        query.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
        query.price.$lte = Number(req.query.maxPrice);
      }
      if (Object.keys(query.price).length === 0) {
        delete query.price;
      }
    }

    // 6. City filter (Strict city matching: Only show products specifically assigned to this city)
    if (req.query.city && req.query.city !== 'All') {
      const cityRegex = new RegExp(`^${req.query.city.trim()}$`, 'i');
      query.availableCities = cityRegex;
    }

    // 7. Sorting
    const sortField = {};
    switch (req.query.sort) {
      case 'price-low':
        sortField.price = 1;
        break;
      case 'price-high':
        sortField.price = -1;
        break;
      case 'name-asc':
        sortField.name = 1;
        break;
      case 'name-desc':
        sortField.name = -1;
        break;
      case 'oldest':
        sortField.createdAt = 1;
        break;
      case 'newest':
      default:
        sortField.createdAt = -1;
        break;
    }

    const total = await Product.countDocuments(query);

    const isPaginated = req.query.page || req.query.paginate === 'true' || req.query.limit;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || (isPaginated ? 10 : 0));

    let productsQuery = Product.find(query)
      .populate('category', 'name slug image')
      .populate('subcategory', 'name slug image parentCategory')
      .sort(sortField);

    if (limit > 0) {
      productsQuery = productsQuery.skip((page - 1) * limit).limit(limit);
    }

    const products = await productsQuery;

    if (isPaginated) {
      return res.json({
        products,
        total,
        page,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
        limit
      });
    }

    res.set('X-Total-Count', String(total));
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single product by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    let product = null;

    if (isObjectId) {
      product = await Product.findById(rawId)
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory');
    }

    // Try case-insensitive slug
    if (!product) {
      const escaped = rawId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      product = await Product.findOne({ slug: new RegExp(`^${escaped}$`, 'i') })
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory');
    }

    // Try matching normalized name (hyphens replaced with spaces)
    if (!product) {
      const namePattern = rawId.replace(/-/g, ' ');
      const escapedName = namePattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      product = await Product.findOne({ name: new RegExp(`^${escapedName}$`, 'i') })
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory');
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE product
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      fullDescription,
      price,
      originalPrice,
      image,
      images,
      category,
      subcategory,
      sku,
      stock,
      availability,
      included,
      notIncluded,
      cancellationPolicy,
      rating,
      reviewCount,
      badge,
      faqs,
      theme,
      gradientBg,
      isSpecialCard,
      availableCities,
      cityOverrides
    } = req.body;

    // Required fields validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    if (!price && price !== 0) {
      return res.status(400).json({ message: 'Product price is required' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!image) {
      return res.status(400).json({ message: 'Product primary image is required' });
    }

    // Verify Category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Specified category does not exist' });
    }

    // Verify Subcategory if provided
    let validSubcatId = null;
    if (subcategory && subcategory !== 'null' && subcategory !== '') {
      const subcatDoc = await Category.findById(subcategory);
      if (!subcatDoc) {
        return res.status(400).json({ message: 'Specified subcategory does not exist' });
      }
      if (String(subcatDoc.parentCategory) !== String(categoryDoc._id)) {
        return res.status(400).json({
          message: 'Selected subcategory does not belong to the selected category.'
        });
      }
      validSubcatId = subcatDoc._id;
    }

    // Handle slug
    let finalSlug = slug ? slugify(slug) : slugify(name);
    if (!finalSlug) finalSlug = 'product-' + Date.now();
    const existing = await Product.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newProduct = new Product({
      name: name.trim(),
      slug: finalSlug,
      description: description || '',
      fullDescription: fullDescription || description || '',
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      image,
      images: Array.isArray(images) ? images : [],
      category: categoryDoc._id,
      subcategory: validSubcatId,
      sku: sku || '',
      stock: stock !== undefined ? Number(stock) : 100,
      availability: availability !== undefined ? Boolean(availability) : true,
      included: Array.isArray(included) ? included : (included ? [included] : []),
      notIncluded: Array.isArray(notIncluded) ? notIncluded : (notIncluded ? [notIncluded] : []),
      cancellationPolicy: cancellationPolicy || '',
      rating: rating !== undefined ? Number(rating) : 4.8,
      reviewCount: reviewCount !== undefined ? Number(reviewCount) : 50,
      badge: badge || 'Verified Quality Product',
      faqs: Array.isArray(faqs) ? faqs : [],
      theme: theme || '',
      gradientBg: gradientBg || '',
      isSpecialCard: Boolean(isSpecialCard),
      availableCities: Array.isArray(availableCities) ? availableCities : ['All'],
      cityOverrides: Array.isArray(cityOverrides) ? cityOverrides : []
    });

    const saved = await newProduct.save();
    const populated = await Product.findById(saved._id)
      .populate('category', 'name slug image')
      .populate('subcategory', 'name slug image parentCategory');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE product
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updateData = { ...req.body };

    // Validate category/subcategory relationship if both or either are provided
    const targetCategory = updateData.category || product.category;
    if (updateData.subcategory !== undefined) {
      if (updateData.subcategory && updateData.subcategory !== 'null' && updateData.subcategory !== '') {
        const subcatDoc = await Category.findById(updateData.subcategory);
        if (!subcatDoc) {
          return res.status(400).json({ message: 'Specified subcategory does not exist' });
        }
        if (String(subcatDoc.parentCategory) !== String(targetCategory)) {
          return res.status(400).json({
            message: 'Selected subcategory does not belong to the selected category.'
          });
        }
        updateData.subcategory = subcatDoc._id;
      } else {
        updateData.subcategory = null;
      }
    }

    // Slug check if updating slug
    if (updateData.slug) {
      const cleanSlug = slugify(updateData.slug);
      if (cleanSlug && cleanSlug !== product.slug) {
        const exists = await Product.findOne({ slug: cleanSlug, _id: { $ne: product._id } });
        if (exists) {
          return res.status(400).json({ message: 'Slug already in use by another product' });
        }
        updateData.slug = cleanSlug;
      }
    }

    const updated = await Product.findByIdAndUpdate(product._id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('category', 'name slug image')
      .populate('subcategory', 'name slug image parentCategory');

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE product
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
