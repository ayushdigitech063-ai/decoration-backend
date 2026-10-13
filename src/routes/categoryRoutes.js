const express = require('express');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const Category = require('../models/Category');
const Product = require('../models/Product');

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

async function causesCircularHierarchy(categoryId, potentialParentId) {
  if (!potentialParentId) return false;
  if (String(categoryId) === String(potentialParentId)) return true;
  let curr = await Category.findById(potentialParentId);
  while (curr && curr.parentCategory) {
    if (String(curr.parentCategory) === String(categoryId)) return true;
    curr = await Category.findById(curr.parentCategory);
  }
  return false;
}

// GET all categories or filtered
router.get('/', async (req, res) => {
  try {
    const query = {};

    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search.trim(), $options: 'i' };
    }

    // Filter by parent
    if (req.query.parentOnly === 'true' || req.query.parent === 'root') {
      query.parentCategory = null;
    } else if (req.query.parentCategory) {
      if (req.query.parentCategory === 'null' || req.query.parentCategory === 'root') {
        query.parentCategory = null;
      } else {
        query.parentCategory = req.query.parentCategory;
      }
    }

    // Filter by active status
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    const sortOption = { order: 1, createdAt: -1 };
    if (req.query.sort === 'name-asc') {
      sortOption.name = 1;
      delete sortOption.order;
    } else if (req.query.sort === 'name-desc') {
      sortOption.name = -1;
      delete sortOption.order;
    }

    const total = await Category.countDocuments(query);

    let categoriesQuery = Category.find(query)
      .populate('parentCategory', 'name slug')
      .sort(sortOption);

    const isPaginated = req.query.page || req.query.paginate === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);

    if (isPaginated) {
      categoriesQuery = categoriesQuery.skip((page - 1) * limit).limit(limit);
    }

    const categories = await categoriesQuery;

    // Aggregate product counts for these categories
    const categoryIds = categories.map(c => c._id);
    const [productCounts, subcategoryCounts] = await Promise.all([
      Product.aggregate([
        {
          $match: {
            $or: [
              { category: { $in: categoryIds } },
              { subcategory: { $in: categoryIds } }
            ]
          }
        },
        {
          $facet: {
            byCat: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
            bySubcat: [{ $group: { _id: '$subcategory', count: { $sum: 1 } } }]
          }
        }
      ]),
      Category.aggregate([
        { $match: { parentCategory: { $in: categoryIds } } },
        { $group: { _id: '$parentCategory', count: { $sum: 1 } } }
      ])
    ]);

    const productCountMap = {};
    if (productCounts && productCounts[0]) {
      productCounts[0].byCat.forEach(item => {
        if (item._id) productCountMap[String(item._id)] = (productCountMap[String(item._id)] || 0) + item.count;
      });
      productCounts[0].bySubcat.forEach(item => {
        if (item._id) productCountMap[String(item._id)] = (productCountMap[String(item._id)] || 0) + item.count;
      });
    }

    const subCountMap = {};
    if (subcategoryCounts) {
      subcategoryCounts.forEach(item => {
        if (item._id) subCountMap[String(item._id)] = item.count;
      });
    }

    const enrichedCategories = categories.map(cat => {
      const obj = cat.toObject();
      obj.productCount = productCountMap[String(cat._id)] || 0;
      obj.subcategoriesCount = subCountMap[String(cat._id)] || 0;
      return obj;
    });

    if (isPaginated) {
      return res.json({
        categories: enrichedCategories,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      });
    }

    res.json(enrichedCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET subcategories by parent category ID or slug
router.get('/:id/subcategories', async (req, res) => {
  try {
    let parentId = req.params.id;
    if (!parentId.match(/^[0-9a-fA-F]{24}$/)) {
      const parent = await Category.findOne({
        $or: [
          { slug: parentId.toLowerCase().trim() },
          { name: new RegExp(`^${parentId.trim()}$`, 'i') },
        ],
      });
      if (!parent) {
        return res.json([]);
      }
      parentId = parent._id;
    }

    const subcategories = await Category.find({ parentCategory: parentId })
      .populate('parentCategory', 'name slug')
      .sort({ order: 1, name: 1 });

    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single category by ID or slug
router.get('/:id', async (req, res) => {
  try {
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };
    
    const category = await Category.findOne(query).populate('parentCategory', 'name slug');
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const [productCount, subcategoriesCount] = await Promise.all([
      Product.countDocuments({
        $or: [{ category: category._id }, { subcategory: category._id }]
      }),
      Category.countDocuments({ parentCategory: category._id })
    ]);

    const obj = category.toObject();
    obj.productCount = productCount;
    obj.subcategoriesCount = subcategoriesCount;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE category
router.post('/', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, slug, description, image, parentCategory, isActive, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    let finalSlug = slug ? slugify(slug) : slugify(name);
    if (!finalSlug) {
      finalSlug = 'category-' + Date.now();
    }

    // Check slug collision
    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Validate parentCategory if provided
    let validParent = null;
    if (parentCategory && parentCategory !== 'null' && parentCategory !== '') {
      const parentDoc = await Category.findById(parentCategory);
      if (!parentDoc) {
        return res.status(400).json({ message: 'Selected parent category does not exist' });
      }
      validParent = parentDoc._id;
    }

    const category = new Category({
      name: name.trim(),
      slug: finalSlug,
      description: description || '',
      image: image || '',
      parentCategory: validParent,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      order: Number(order) || 0
    });

    const savedCategory = await category.save();
    const populated = await Category.findById(savedCategory._id).populate('parentCategory', 'name slug');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE category
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, slug, description, image, parentCategory, isActive, order } = req.body;

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    if (order !== undefined) category.order = Number(order) || 0;

    // If slug is provided and changed
    if (slug) {
      const cleanSlug = slugify(slug);
      if (cleanSlug && cleanSlug !== category.slug) {
        const existing = await Category.findOne({ slug: cleanSlug, _id: { $ne: category._id } });
        if (existing) {
          return res.status(400).json({ message: 'Category slug is already in use' });
        }
        category.slug = cleanSlug;
      }
    }

    // If parentCategory is being updated
    if (parentCategory !== undefined) {
      if (parentCategory === null || parentCategory === '' || parentCategory === 'null') {
        category.parentCategory = null;
      } else {
        if (String(parentCategory) === String(category._id)) {
          return res.status(400).json({ message: 'A category cannot be its own parent' });
        }
        const isCircular = await causesCircularHierarchy(category._id, parentCategory);
        if (isCircular) {
          return res.status(400).json({ message: 'Invalid hierarchy: circular parent relationship detected' });
        }
        const parentDoc = await Category.findById(parentCategory);
        if (!parentDoc) {
          return res.status(400).json({ message: 'Selected parent category does not exist' });
        }
        category.parentCategory = parentDoc._id;
      }
    }

    const updatedCategory = await category.save();
    const populated = await Category.findById(updatedCategory._id).populate('parentCategory', 'name slug');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE category with safety guards
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Check if category has child subcategories
    const childCount = await Category.countDocuments({ parentCategory: category._id });
    if (childCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category: It has ${childCount} active child subcategories. Please reassign or delete them first.`
      });
    }

    // Check if category has associated products
    const productCount = await Product.countDocuments({
      $or: [{ category: category._id }, { subcategory: category._id }]
    });
    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category: It is currently linked to ${productCount} products. Please reassign or remove the products first.`
      });
    }

    await Category.findByIdAndDelete(category._id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
