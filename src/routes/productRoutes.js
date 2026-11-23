const express = require('express');
const mongoose = require('mongoose');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const Category = require('../models/Category');
const City = require('../models/City');

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

// -------------------------------------------------------------
// GET /api/products/resolve-city
// Resolves a product for a new target city via productGroupId or slug
// -------------------------------------------------------------
router.get('/resolve-city', async (req, res) => {
  try {
    const { productGroupId, slug, targetCity } = req.query;
    if (!targetCity) {
      return res.status(400).json({ message: 'targetCity parameter is required' });
    }

    const cityRegex = new RegExp(`^${targetCity.trim()}$`, 'i');
    let matchedProduct = null;

    if (productGroupId) {
      matchedProduct = await Product.findOne({
        productGroupId: String(productGroupId).trim(),
        city: cityRegex,
        availability: true
      })
      .populate('category', 'name slug image')
      .populate('subcategory', 'name slug image parentCategory');
    }

    if (!matchedProduct && slug) {
      const cleanSlug = slugify(slug);
      matchedProduct = await Product.findOne({
        slug: cleanSlug,
        city: cityRegex,
        availability: true
      })
      .populate('category', 'name slug image')
      .populate('subcategory', 'name slug image parentCategory');
    }

    if (!matchedProduct) {
      return res.status(404).json({
        found: false,
        message: `Product is not currently available in ${targetCity}`
      });
    }

    res.json({
      found: true,
      product: matchedProduct
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------------------------------------
// POST /api/products/:id/duplicate-cities
// Clones an existing product into one or multiple target cities
// -------------------------------------------------------------
router.post('/:id/duplicate-cities', protect, superAdminOnly, async (req, res) => {
  try {
    const { targetCities, customPrices } = req.body;
    if (!Array.isArray(targetCities) || targetCities.length === 0) {
      return res.status(400).json({ message: 'targetCities must be a non-empty array' });
    }

    const sourceProduct = await Product.findById(req.params.id);
    if (!sourceProduct) {
      return res.status(404).json({ message: 'Source product not found' });
    }

    const groupId = sourceProduct.productGroupId || `grp_${sourceProduct.slug || String(sourceProduct._id)}`;
    
    // Ensure source product has the productGroupId assigned
    if (!sourceProduct.productGroupId) {
      sourceProduct.productGroupId = groupId;
      await sourceProduct.save();
    }

    const createdClones = [];
    const skippedCities = [];

    for (const rawCity of targetCities) {
      const city = String(rawCity).trim();
      if (!city) continue;

      // Duplicate prevention: check if this product already exists in this city
      const existing = await Product.findOne({
        slug: sourceProduct.slug,
        city: new RegExp(`^${city}$`, 'i')
      });

      if (existing) {
        skippedCities.push(city);
        continue;
      }

      // Determine price override if provided
      let finalPrice = sourceProduct.price;
      if (customPrices && typeof customPrices === 'object' && customPrices[city] !== undefined) {
        const parsed = Number(customPrices[city]);
        if (!isNaN(parsed) && parsed > 0) {
          finalPrice = parsed;
        }
      }

      const cloneDoc = new Product({
        ...sourceProduct.toObject(),
        _id: new mongoose.Types.ObjectId(),
        city: city,
        price: finalPrice,
        productGroupId: groupId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const saved = await cloneDoc.save();
      createdClones.push(saved);
    }

    res.status(201).json({
      success: true,
      productGroupId: groupId,
      createdCount: createdClones.length,
      skippedCities,
      createdProducts: createdClones
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------------------------------------
// GET /api/products
// GET all products with server-side city matching, search, and filters
// -------------------------------------------------------------
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

    // 2. Category filter
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

    // 3. Subcategory filter
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

    // 6. City filter: supports both city field & legacy availableCities for backward compatibility
    if (req.query.city && req.query.city !== 'All' && req.query.city !== 'all') {
      const cityRegex = new RegExp(`^${req.query.city.trim()}$`, 'i');
      query.$or = [
        { city: cityRegex },
        { availableCities: cityRegex }
      ];
    }

    // 7. Group filter (optional)
    if (req.query.productGroupId) {
      query.productGroupId = req.query.productGroupId;
    }

    // 8. Sorting
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
      .populate('subSubcategory', 'name slug image parentCategory')
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

// -------------------------------------------------------------
// GET /api/products/:id
// GET single product by ID or slug with optional city context
// -------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    const cityParam = req.query.city ? String(req.query.city).trim() : null;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    let product = null;

    // 1. Direct ID lookup
    if (isObjectId) {
      product = await Product.findById(rawId)
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory')
        .populate('subSubcategory', 'name slug image parentCategory');
    }

    // 2. Slug + City lookup if city is provided
    if (!product && cityParam && cityParam.toLowerCase() !== 'all') {
      const cleanSlug = slugify(rawId);
      const cityRegex = new RegExp(`^${cityParam}$`, 'i');
      product = await Product.findOne({ slug: cleanSlug, city: cityRegex })
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory')
        .populate('subSubcategory', 'name slug image parentCategory');
    }

    // 3. Fallback: Slug lookup
    if (!product) {
      const escaped = rawId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      product = await Product.findOne({ slug: new RegExp(`^${escaped}$`, 'i') })
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory')
        .populate('subSubcategory', 'name slug image parentCategory');
    }

    // 4. Fallback: Normalized name lookup
    if (!product) {
      const namePattern = rawId.replace(/-/g, ' ');
      const escapedName = namePattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      product = await Product.findOne({ name: new RegExp(`^${escapedName}$`, 'i') })
        .populate('category', 'name slug image')
        .populate('subcategory', 'name slug image parentCategory')
        .populate('subSubcategory', 'name slug image parentCategory');
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------------------------------------------------------
// POST /api/products
// CREATE product (Supports single city or bulk "All Cities" generation)
// -------------------------------------------------------------
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const {
      name,
      slug,
      city,
      createForAllCities,
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
      serviceablePincodes
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
      validSubcatId = subcatDoc._id;
    }

    // Handle slug
    let baseSlug = slug ? slugify(slug) : slugify(name);
    if (!baseSlug) baseSlug = 'product-' + Date.now();

    // Assign unified productGroupId
    const productGroupId = `grp_${baseSlug}_${Date.now().toString().slice(-4)}`;

    // Check if creating for All Cities
    if (createForAllCities === true || (Array.isArray(req.body.availableCities) && req.body.availableCities.includes('All'))) {
      const activeCities = await City.find({ isActive: true });
      const cityList = activeCities.length > 0
        ? activeCities.map(c => c.name.trim())
        : ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Jaipur', 'Pune'];

      const createdDocs = [];
      for (const cityName of cityList) {
        // Ensure no duplicate (slug, city)
        const exists = await Product.findOne({ slug: baseSlug, city: cityName });
        const finalSlug = exists ? `${baseSlug}-${Date.now().toString().slice(-3)}` : baseSlug;

        const prodDoc = new Product({
          name: name.trim(),
          slug: finalSlug,
          city: cityName,
          productGroupId: productGroupId,
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
          serviceablePincodes: Array.isArray(serviceablePincodes) ? serviceablePincodes : []
        });

        const saved = await prodDoc.save();
        createdDocs.push(saved);
      }

      return res.status(201).json(createdDocs[0]);
    }

    // Single City Creation
    const targetCity = city ? String(city).trim() : 'Delhi';
    const existing = await Product.findOne({ slug: baseSlug, city: targetCity });
    const finalSlug = existing ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    const newProduct = new Product({
      name: name.trim(),
      slug: finalSlug,
      city: targetCity,
      productGroupId: productGroupId,
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
      serviceablePincodes: Array.isArray(serviceablePincodes) ? serviceablePincodes : []
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

// -------------------------------------------------------------
// UPDATE product
// -------------------------------------------------------------
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const updateData = { ...req.body };

    // Validate category/subcategory relationship
    const targetCategory = updateData.category || product.category;
    if (updateData.subcategory !== undefined) {
      if (updateData.subcategory && updateData.subcategory !== 'null' && updateData.subcategory !== '') {
        const subcatDoc = await Category.findById(updateData.subcategory);
        if (!subcatDoc) {
          return res.status(400).json({ message: 'Specified subcategory does not exist' });
        }
        updateData.subcategory = subcatDoc._id;
      } else {
        updateData.subcategory = null;
      }
    }

    // Slug check (scoped to this product's city)
    if (updateData.slug) {
      const cleanSlug = slugify(updateData.slug);
      const targetCity = updateData.city || product.city;
      if (cleanSlug && (cleanSlug !== product.slug || targetCity !== product.city)) {
        const exists = await Product.findOne({
          slug: cleanSlug,
          city: targetCity,
          _id: { $ne: product._id }
        });
        if (exists) {
          return res.status(400).json({ message: `Slug already in use for city "${targetCity}"` });
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

// -------------------------------------------------------------
// DELETE product
// -------------------------------------------------------------
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
