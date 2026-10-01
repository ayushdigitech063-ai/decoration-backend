require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const productsData = require('./seedData.json');

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

const seedProducts = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/partysquare');
    console.log(`Connected to MongoDB: ${conn.connection.host}`);

    // Create unique categories and subcategories
    const categoryCache = {}; // name -> _id
    const subcategoryCache = {}; // `${parentName}|${subName}` -> _id

    for (const prod of productsData) {
      if (prod.category && !categoryCache[prod.category]) {
        const catSlug = slugify(prod.category);
        let categoryDoc = await Category.findOne({ slug: catSlug });
        if (!categoryDoc) {
          categoryDoc = await Category.create({ name: prod.category, slug: catSlug });
        }
        categoryCache[prod.category] = categoryDoc._id;
      }

      if (prod.category && prod.subcategory) {
        const key = `${prod.category}|${prod.subcategory}`;
        if (!subcategoryCache[key]) {
          const subSlug = slugify(prod.category + '-' + prod.subcategory);
          let subDoc = await Category.findOne({ slug: subSlug });
          if (!subDoc) {
             subDoc = await Category.create({
               name: prod.subcategory,
               slug: subSlug,
               parentCategory: categoryCache[prod.category]
             });
          }
          subcategoryCache[key] = subDoc._id;
        }
      }
    }

    console.log('Categories seeded.');

    let upsertedCount = 0;

    for (const prod of productsData) {
      const catId = categoryCache[prod.category] || null;
      const subId = prod.subcategory ? subcategoryCache[`${prod.category}|${prod.subcategory}`] : null;

      const productObj = {
        name: prod.name,
        slug: prod.slug || slugify(prod.name),
        description: prod.description || '',
        price: prod.price || 0,
        image: prod.image || '',
        category: catId,
        subcategory: subId,
        availability: prod.availability !== undefined ? prod.availability : true,
        included: prod.included || [],
        rating: prod.rating || 0,
        reviewCount: prod.reviewCount || 0
      };

      if (!productObj.category) {
          console.warn(`Product ${prod.name} has no category. Skipping.`);
          continue;
      }

      await Product.findOneAndUpdate(
        { slug: productObj.slug },
        { $set: productObj },
        { upsert: true, new: true }
      );
      upsertedCount++;
    }

    console.log(`✅ ${upsertedCount} Products seeded successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();
