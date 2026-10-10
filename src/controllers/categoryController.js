// src/controllers/categoryController.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const makeSlug = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/[^\w-]+/g, '');


const isDescendant = async (categoryId, targetParentId) => {
  let current = await Category.findById(targetParentId);
  while (current && current.parentCategory) {
    if (current.parentCategory.toString() === categoryId.toString()) {
      return true;
    }
    current = await Category.findById(current.parentCategory);
  }
  return false;
};

// ==================== PUBLIC APIS ====================

// 1. Get Category Tree (Optimized MongoDB Aggregation)
// GET /api/v1/categories/tree
const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await Category.aggregate([
      { $match: { parentCategory: null, isActive: true } },
      { $sort: { order: 1, name: 1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: 'parentCategory',
          as: 'subcategories',
          pipeline: [
            { $match: { isActive: true } },
            { $sort: { order: 1, name: 1 } },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Flat Categories
// GET /api/v1/categories
const getAllCategories = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.onlyParents === 'true') {
      filter.parentCategory = null;
    }

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Single Category (by ID or Slug)
// GET /api/v1/categories/:identifier
const getCategoryByIdentifier = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const isId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isId ? { _id: identifier } : { slug: identifier.toLowerCase() };

    const category = await Category.findOne(query).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    let subcategories = [];
    if (!category.parentCategory) {
      subcategories = await Category.find({ parentCategory: category._id, isActive: true }).sort({ order: 1 });
    }

    res.status(200).json({
      success: true,
      data: category,
      subcategories,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN PROTECTED APIS ====================

// 4. Create Category (With Cloudinary Rollback)
// POST /api/v1/categories
const createCategory = async (req, res, next) => {
  let uploadedImageUrl = '';
  try {
    const { name, description, parentCategory, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = makeSlug(name);

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A category with this name or slug already exists' });
    }

    if (parentCategory) {
      const parentExists = await Category.findById(parentCategory);
      if (!parentExists) {
        return res.status(404).json({ success: false, message: 'Selected parent category does not exist' });
      }
    }

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'party_square/categories');
      uploadedImageUrl = uploadResult.secure_url;
    }

    const newCategory = await Category.create({
      name: name.trim(),
      slug,
      image: uploadedImageUrl,
      description: description || '',
      parentCategory: parentCategory || null,
      order: order !== undefined ? Number(order) : 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory,
    });
  } catch (error) {
    // Rollback uploaded image if database insert fails
    if (uploadedImageUrl) {
      await deleteFromCloudinary(uploadedImageUrl);
    }
    next(error);
  }
};

// 5. Update Category
// PUT /api/v1/categories/:id
const updateCategory = async (req, res, next) => {
  let newUploadedUrl = '';
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Direct and indirect circular dependency check
    if (updates.parentCategory) {
      if (updates.parentCategory.toString() === id.toString()) {
        return res.status(400).json({ success: false, message: 'Category cannot be its own parent' });
      }
      const wouldBeCircular = await isDescendant(id, updates.parentCategory);
      if (wouldBeCircular) {
        return res.status(400).json({
          success: false,
          message: 'Circular hierarchy detected: cannot set descendant as parent',
        });
      }
    }

    // Slug check
    if (updates.name && updates.name.trim() !== category.name) {
      updates.name = updates.name.trim();
      updates.slug = makeSlug(updates.name);

      const duplicate = await Category.findOne({ _id: { $ne: id }, slug: updates.slug });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'A category with this updated name already exists' });
      }
    }

    // Image replace or retain
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'party_square/categories');
      newUploadedUrl = uploadResult.secure_url;
      updates.image = newUploadedUrl;

      // Delete old image only after successful new upload
      if (category.image) {
        await deleteFromCloudinary(category.image);
      }
    } else {
      delete updates.image;
    }

    const updatedCategory = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    });
  } catch (error) {
    if (newUploadedUrl) {
      await deleteFromCloudinary(newUploadedUrl);
    }
    next(error);
  }
};

// 6. Delete Category (With Product Linkage & Orphan Protection)
// DELETE /api/v1/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for child categories
    const hasChildren = await Category.findOne({ parentCategory: id });
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that contains subcategories. Delete or move them first.',
      });
    }

    // Check for attached products
    const linkedProduct = await Product.findOne({
      $or: [{ category: id }, { subcategory: id }],
    });
    if (linkedProduct) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category because active products are assigned to it.',
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.image) {
      await deleteFromCloudinary(category.image);
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


module.exports  = {
getCategoryTree,
getAllCategories,
getCategoryByIdentifier,  
createCategory,
updateCategory,
deleteCategory
}