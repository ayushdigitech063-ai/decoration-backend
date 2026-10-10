// src/controllers/cityController.js
const City = require('../models/City');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Helper: URL-friendly slug generator
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Spaces ko dash (-) me convert kare
    .replace(/[^\w\-]+/g, '')    // Special characters remove kare
    .replace(/\-\-+/g, '-');     // Double dashes ko single dash kare
};

// ==================== PUBLIC APIS ====================

// 1. Get All Active Cities (Dropdowns aur Header ke liye)
// GET /api/v1/cities
exports.getAllCities = async (req, res, next) => {
  try {
    const cities = await City.find({ isActive: true })
      .sort({ order: 1, isPopular: -1, name: 1 })
      .select('name slug state icon isPopular order');

    res.status(200).json({
      success: true,
      count: cities.length,
      data: cities,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Single City by Slug or ID
// GET /api/v1/cities/:identifier
exports.getCityByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: identifier } : { slug: identifier.toLowerCase() };

    const city = await City.findOne(query);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City nahi mili',
      });
    }

    res.status(200).json({
      success: true,
      data: city,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SUPER ADMIN PROTECTED APIS ====================

// 3. Create City (Icon Upload via Cloudinary)
// POST /api/v1/cities (multipart/form-data)
exports.createCity = async (req, res, next) => {
  let uploadedIconUrl = '';
  try {
    const { name, state, isPopular, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }

    const slug = generateSlug(name);

    // Duplicate check
    const existingCity = await City.findOne({
      $or: [{ name: name.trim() }, { slug }],
    });

    if (existingCity) {
      return res.status(409).json({
        success: false,
        message: 'this city name is already exists',
      });
    }

    // Icon Upload (Multer file buffer check)
    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.buffer, 'party_square/cities');
      uploadedIconUrl = uploadRes.secure_url;
    }

    const newCity = await City.create({
      name: name.trim(),
      slug,
      state: state ? state.trim() : '',
      icon: uploadedIconUrl || '',
      isPopular: isPopular === 'true' || isPopular === true,
      order: order !== undefined ? Number(order) : 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'City creted successfully ',
      data: newCity,
    });
  } catch (error) {
   
    if (uploadedIconUrl) {
      await deleteFromCloudinary(uploadedIconUrl);
    }
    next(error);
  }
};

// 4. Update City (Icon Swap & Rollback Support)
// PUT /api/v1/cities/:id (multipart/form-data)
exports.updateCity = async (req, res, next) => {
  let newlyUploadedIconUrl = '';
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found to update',
      });
    }

    // Agar name update ho raha hai toh slug bhi sync karo
    if (updates.name && updates.name.trim() !== city.name) {
      updates.name = updates.name.trim();
      updates.slug = generateSlug(updates.name);

      const duplicate = await City.findOne({
        _id: { $ne: id },
        $or: [{ name: updates.name }, { slug: updates.slug }],
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'city is already exists with this name or slug',
        });
      }
    }

    // Naya Icon aaya hai toh swap karo
    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.buffer, 'party_square/cities');
      newlyUploadedIconUrl = uploadRes.secure_url;
      updates.icon = newlyUploadedIconUrl;

      // Purana icon Cloudinary se delete karo
      if (city.icon) {
        await deleteFromCloudinary(city.icon);
      }
    } else {
      // Agar file nahi aayi toh purana icon hi retain rahega
      delete updates.icon;
    }

    // Form-data boolean & number type parsing
    if (updates.isPopular !== undefined) {
      updates.isPopular = updates.isPopular === 'true' || updates.isPopular === true;
    }
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === 'true' || updates.isActive === true;
    }
    if (updates.order !== undefined) {
      updates.order = Number(updates.order);
    }

    const updatedCity = await City.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'City details are updated',
      data: updatedCity,
    });
  } catch (error) {
    // Rollback: Agar DB update fail hota hai toh newly uploaded icon delete karo
    if (newlyUploadedIconUrl) {
      await deleteFromCloudinary(newlyUploadedIconUrl);
    }
    next(error);
  }
};

// 5. Delete City (With Cloudinary Icon Cleanup)
// DELETE /api/v1/cities/:id
exports.deleteCity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const city = await City.findById(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City is not found for  delete ',
      });
    }

    // Cloudinary se icon teardown
    if (city.icon) {
      await deleteFromCloudinary(city.icon);
    }

    await City.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'City and its  icon are deleted successfully ',
    });
  } catch (error) {
    next(error);
  }
};