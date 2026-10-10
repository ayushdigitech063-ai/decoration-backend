// src/controllers/productController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const City = require('../models/City');
const {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
} = require('../config/cloudinary');

// URL Slug generator helper
const makeSlug = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/[^\w-]+/g, '');

// =========================================================================
// 1. GET ALL PRODUCTS (City, Category, Pagination & Sorting)
// GET /api/v1/products?city=jaipur&category=independence-day&itemType=decoration&page=1&limit=12
// =========================================================================
exports.getAllProducts = async (req, res, next) => {
  try {
    const {
      city,
      category,
      subcategory,
      itemType,
      search,
      page = 1,
      limit = 12,
      sort = '-createdAt',
    } = req.query;

    // Base condition: Sirf active/in-stock items
    const query = { availability: true };

    // A. STRICT CITY FILTER (Decoration & Retail Products)
    if (city) {
      const isCityId = city.match(/^[0-9a-fA-F]{24}$/);
      const cityDoc = await City.findOne(
        isCityId ? { _id: city } : { slug: city.toLowerCase() }
      );

      if (cityDoc) {
        // Condition: Ya toh product is city me available ho, YA pan-India (isAllCities: true) ho
        query.$or = [
          { availableCities: cityDoc._id },
          { isAllCities: true },
        ];
      } else {
        // Invalid city query hone par empty array return karo
        return res.status(200).json({
          success: true,
          count: 0,
          pagination: { total: 0, page: Number(page), pages: 0 },
          data: [],
        });
      }
    }

    // B. CATEGORY FILTER (Slug ya ObjectId dono chalega)
    if (category) {
      const isCatId = category.match(/^[0-9a-fA-F]{24}$/);
      const catDoc = await Category.findOne(
        isCatId ? { _id: category } : { slug: category.toLowerCase() }
      );
      if (catDoc) query.category = catDoc._id;
    }

    // C. SUBCATEGORY FILTER
    if (subcategory) {
      const isSubId = subcategory.match(/^[0-9a-fA-F]{24}$/);
      const subDoc = await Category.findOne(
        isSubId ? { _id: subcategory } : { slug: subcategory.toLowerCase() }
      );
      if (subDoc) query.subcategory = subDoc._id;
    }

    // D. ITEM TYPE FILTER ('decoration' ya 'product')
    if (itemType) {
      query.itemType = itemType;
    }

    // E. TEXT SEARCH (Title & Description search)
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .populate('subcategory', 'name slug')
        .populate('availableCities', 'name slug state')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 2. GET SINGLE PRODUCT (By Slug or ObjectId)
// GET /api/v1/products/:identifier?city=jaipur
// =========================================================================
exports.getProductByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { city } = req.query;

    const isId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isId ? { _id: identifier } : { slug: identifier.toLowerCase() };

    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('availableCities', 'name slug state');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verification: Kya ye product user ki selected city me available hai?
    let isAvailableInSelectedCity = true;
    if (city) {
      const isCityId = city.match(/^[0-9a-fA-F]{24}$/);
      const cityDoc = await City.findOne(
        isCityId ? { _id: city } : { slug: city.toLowerCase() }
      );

      if (cityDoc && !product.isAllCities) {
        isAvailableInSelectedCity = product.availableCities.some(
          (c) => c._id.toString() === cityDoc._id.toString()
        );
      }
    }

    res.status(200).json({
      success: true,
      data: product,
      isAvailableInSelectedCity,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 3. CREATE PRODUCT (Super Admin Only)
// POST /api/v1/products (multipart/form-data)
// =========================================================================
exports.createProduct = async (req, res, next) => {
  let uploadedImages = []; // Rollback tracking array
  try {
    const {
      name,
      description,
      fullDescription,
      price,
      originalPrice,
      category,
      subcategory,
      itemType,
      availableCities,
      isAllCities,
      included,
      notIncluded,
      cancellationPolicy,
      badge,
      faqs,
      order,
    } = req.body;

    // 1. Mandatory Fields Validation
    if (!name || !price || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, category, and description are required',
      });
    }

    if (!req.files?.image?.[0]) {
      return res.status(400).json({
        success: false,
        message: 'Primary display image is required',
      });
    }

    // 2. Slug Generation & Conflict Check
    const slug = makeSlug(name);
    const slugExists = await Product.findOne({ slug });
    if (slugExists) {
      return res.status(409).json({
        success: false,
        message: 'A product with this name or slug already exists',
      });
    }

    // 3. Validate Category Existence
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Referenced category does not exist',
      });
    }

    // 4. Form-data parsing for arrays and booleans
    const parsedCities = typeof availableCities === 'string' ? JSON.parse(availableCities) : availableCities || [];
    const parsedIsAllCities = isAllCities === 'true' || isAllCities === true;
    const parsedIncluded = typeof included === 'string' ? JSON.parse(included) : included || [];
    const parsedNotIncluded = typeof notIncluded === 'string' ? JSON.parse(notIncluded) : notIncluded || [];
    const parsedFaqs = typeof faqs === 'string' ? JSON.parse(faqs) : faqs || [];

    // 5. City Validation: Agar Pan-India nahi hai toh kam se kam ek city honi chahiye
    if (!parsedIsAllCities && parsedCities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please assign at least one city or mark isAllCities as true',
      });
    }

    // 6. Upload Primary Image to Cloudinary
    let primaryImageUrl = '';
    const primaryUpload = await uploadToCloudinary(
      req.files.image[0].buffer,
      'party_square/products'
    );
    primaryImageUrl = primaryUpload.secure_url;
    uploadedImages.push(primaryImageUrl);

    // 7. Upload Gallery Images to Cloudinary (Concurrent Stream)
    let galleryUrls = [];
    if (req.files?.images?.length > 0) {
      galleryUrls = await uploadMultipleToCloudinary(
        req.files.images,
        'party_square/products'
      );
      uploadedImages.push(...galleryUrls);
    }

    // 8. Create Record in MongoDB
    const newProduct = await Product.create({
      name: name.trim(),
      slug,
      itemType: itemType || 'decoration',
      description: description.trim(),
      fullDescription: fullDescription || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      image: primaryImageUrl,
      images: galleryUrls,
      category,
      subcategory: subcategory || null,
      availableCities: parsedCities,
      isAllCities: parsedIsAllCities,
      included: parsedIncluded,
      notIncluded: parsedNotIncluded,
      cancellationPolicy: cancellationPolicy || undefined,
      badge: badge || undefined,
      faqs: parsedFaqs,
      order: order !== undefined ? Number(order) : 0,
      availability: true,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    // ROLLBACK: Agar DB write fail ho jaye toh Cloudinary se nayi images delete karo
    if (uploadedImages.length > 0) {
      await Promise.all(uploadedImages.map((url) => deleteFromCloudinary(url)));
    }
    next(error);
  }
};

// =========================================================================
// 4. UPDATE PRODUCT (Super Admin Only)
// PUT /api/v1/products/:id (multipart/form-data)
// =========================================================================
exports.updateProduct = async (req, res, next) => {
  let newlyUploadedUrls = []; // Crash hone par rollback ke liye
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Slug Sync if name changes
    if (updates.name && updates.name.trim() !== product.name) {
      updates.name = updates.name.trim();
      updates.slug = makeSlug(updates.name);

      const duplicate = await Product.findOne({ _id: { $ne: id }, slug: updates.slug });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'A product with this updated name already exists',
        });
      }
    }

    // ─── PRIMARY IMAGE MANAGEMENT ───
    if (req.files?.image?.[0]) {
      // Step 1: Nayi primary image upload karo
      const primaryUpload = await uploadToCloudinary(
        req.files.image[0].buffer,
        'party_square/products'
      );
      updates.image = primaryUpload.secure_url;
      newlyUploadedUrls.push(updates.image);

      // Step 2: Purani primary image Cloudinary se delete karo
      if (product.image) {
        await deleteFromCloudinary(product.image);
      }
    } else {
      // Agar nayi primary image nahi aayi toh purani retain rahegi
      delete updates.image;
    }

    // ─── GALLERY IMAGES MANAGEMENT ───
    let currentGallery = [...(product.images || [])];

    // Case A: Remove Selected Images from Gallery
    // Frontend removed images list bhej sakta hai: removedImages='["https://.../img1.webp"]'
    if (updates.removedImages) {
      const toRemove = typeof updates.removedImages === 'string'
        ? JSON.parse(updates.removedImages)
        : updates.removedImages;

      if (Array.isArray(toRemove) && toRemove.length > 0) {
        // Cloudinary se delete karo
        await Promise.all(toRemove.map((url) => deleteFromCloudinary(url)));

        // Local array se filter out karo
        currentGallery = currentGallery.filter((url) => !toRemove.includes(url));
      }
      delete updates.removedImages;
    }

    // Case B: Append Newly Uploaded Gallery Images
    if (req.files?.images?.length > 0) {
      const uploadedGalleryUrls = await uploadMultipleToCloudinary(
        req.files.images,
        'party_square/products'
      );
      newlyUploadedUrls.push(...uploadedGalleryUrls);

      currentGallery = [...currentGallery, ...uploadedGalleryUrls];
    }

    // Final gallery list ko updates me set karo
    updates.images = currentGallery;

    // ─── FORM-DATA PARSING (ARRAYS, BOOLS, NUMBERS) ───
    if (updates.availableCities) {
      updates.availableCities = typeof updates.availableCities === 'string'
        ? JSON.parse(updates.availableCities)
        : updates.availableCities;
    }
    if (updates.isAllCities !== undefined) {
      updates.isAllCities = updates.isAllCities === 'true' || updates.isAllCities === true;
    }
    if (updates.included) {
      updates.included = typeof updates.included === 'string' ? JSON.parse(updates.included) : updates.included;
    }
    if (updates.notIncluded) {
      updates.notIncluded = typeof updates.notIncluded === 'string' ? JSON.parse(updates.notIncluded) : updates.notIncluded;
    }
    if (updates.faqs) {
      updates.faqs = typeof updates.faqs === 'string' ? JSON.parse(updates.faqs) : updates.faqs;
    }
    if (updates.price) updates.price = Number(updates.price);
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice);

    // ─── DATABASE UPDATE ───
    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    // ROLLBACK: Agar update fail hota hai toh newly uploaded images clean karo
    if (newlyUploadedUrls.length > 0) {
      await Promise.all(newlyUploadedUrls.map((url) => deleteFromCloudinary(url)));
    }
    next(error);
  }
};

// =========================================================================
// 5. DELETE PRODUCT (Super Admin Only)
// DELETE /api/v1/products/:id
// =========================================================================
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Primary image + saari gallery images ka complete teardown
    const allImages = [product.image, ...(product.images || [])].filter(Boolean);
    await Promise.all(allImages.map((url) => deleteFromCloudinary(url)));

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product and all associated media deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};