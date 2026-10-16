require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ts = require('../../../party-square/node_modules/typescript');
const Category = require('../models/Category');
const Product = require('../models/Product');

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function runMigration() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const dataDir = path.resolve(__dirname, '../../../party-square/app/data');
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found at ${dataDir}`);
    }

    const files = fs.readdirSync(dataDir).filter(
      (f) => f.endsWith('.ts') && f !== 'faqData.ts' && f !== 'productResolver.ts'
    );

    const categoryCache = {}; // name -> _id
    const subcategoryCache = {}; // `${parentName}|${subName}` -> _id

    // Preload existing categories from DB
    const existingCats = await Category.find({});
    for (const cat of existingCats) {
      categoryCache[cat.name.toLowerCase().trim()] = cat._id;
      if (cat.slug) categoryCache[cat.slug.toLowerCase().trim()] = cat._id;
    }

    async function getOrCreateCategory(catName) {
      if (!catName || typeof catName !== 'string') catName = 'Decorations';
      const cleanName = catName.trim();
      const lower = cleanName.toLowerCase();
      if (categoryCache[lower]) return categoryCache[lower];

      const slug = slugify(cleanName);
      let doc = await Category.findOne({ $or: [{ slug }, { name: new RegExp(`^${cleanName}$`, 'i') }] });
      if (!doc) {
        doc = await Category.create({ name: cleanName, slug, isActive: true });
        console.log(`Created Category: ${cleanName} (${slug})`);
      }
      categoryCache[lower] = doc._id;
      categoryCache[slug] = doc._id;
      return doc._id;
    }

    async function getOrCreateSubcategory(subName, parentCatId, parentName) {
      if (!subName || typeof subName !== 'string') return null;
      const cleanSub = subName.trim();
      const key = `${parentName}|${cleanSub}`.toLowerCase();
      if (subcategoryCache[key]) return subcategoryCache[key];

      const subSlug = slugify(`${parentName}-${cleanSub}`);
      let doc = await Category.findOne({ $or: [{ slug: subSlug }, { name: new RegExp(`^${cleanSub}$`, 'i'), parentCategory: parentCatId }] });
      if (!doc) {
        doc = await Category.create({
          name: cleanSub,
          slug: subSlug,
          parentCategory: parentCatId,
          isActive: true
        });
        console.log(`Created Subcategory: ${cleanSub} under ${parentName}`);
      }
      subcategoryCache[key] = doc._id;
      return doc._id;
    }

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const file of files) {
      console.log(`Processing ${file}...`);
      try {
        let code = fs.readFileSync(path.join(dataDir, file), 'utf8');
        code = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
        const js = ts.transpileModule(code, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;

        const exports = {};
        const module = { exports };
        const weddingGifts = [];
        const festivalsProducts = [];
        const pujaSection = [];
        const estheticProducts = [];
        const christmasProducts = [];
        const galleryProducts = [];
        eval(js);

        const allItemsInFile = [];
        for (const key of Object.keys(exports)) {
          if (Array.isArray(exports[key])) {
            allItemsInFile.push(...exports[key]);
          }
        }

        console.log(`Found ${allItemsInFile.length} items in ${file}`);

        for (const raw of allItemsInFile) {
          if (!raw || (!raw.name && !raw.title)) continue;

          const name = (raw.name || raw.title || '').trim();
          let rawCat = raw.category || 'Festivals';
          if (typeof rawCat === 'object' && rawCat !== null) {
            rawCat = rawCat.name || rawCat.slug || 'Festivals';
          }

          // If file is festival specific, ensure category is or links to Festivals
          if (file.includes('diwali') || file.includes('christmas') || file.includes('ganesh') ||
              file.includes('lohri') || file.includes('navratri') || file.includes('janmashtami') ||
              file.includes('independenceday')) {
            if (!raw.subcategory) {
              raw.subcategory = String(rawCat);
            }
            rawCat = 'Festivals';
          }

          const catId = await getOrCreateCategory(String(rawCat));
          const subId = raw.subcategory ? await getOrCreateSubcategory(String(raw.subcategory), catId, String(rawCat)) : null;

          const priceVal = typeof raw.price === 'number' ? raw.price : Number(String(raw.price || 0).replace(/[^0-9.]/g, '')) || 0;
          const originalPriceVal = raw.originalPrice ? (typeof raw.originalPrice === 'number' ? raw.originalPrice : Number(String(raw.originalPrice).replace(/[^0-9.]/g, '')) || Math.round(priceVal * 1.25)) : Math.round(priceVal * 1.25);

          const slug = raw.slug ? slugify(raw.slug) : slugify(name);
          if (!slug) continue;

          const productDoc = {
            name,
            slug,
            description: raw.description || raw.subtitle || `${name} premium decoration service.`,
            fullDescription: raw.fullDescription || raw.description || '',
            price: priceVal,
            originalPrice: originalPriceVal,
            image: raw.image || '/homepage.png',
            images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [raw.image || '/homepage.png'],
            category: catId,
            subcategory: subId,
            availability: raw.availability !== undefined ? raw.availability : true,
            stock: 100,
            rating: Number(raw.rating) || 4.8,
            reviewCount: Number(raw.reviewCount) || 50,
            included: Array.isArray(raw.included) && raw.included.length > 0 ? raw.included : [
              '100% Customized setup',
              'Professional on-site decorator',
              'Quality checked materials'
            ],
            availableCities: ['All', 'Jaipur', 'Delhi', 'Bangalore', 'Mumbai', 'Indore', 'Ahmedabad'],
            isSpecialCard: false,
          };

          await Product.findOneAndUpdate(
            { slug: productDoc.slug },
            { $set: productDoc },
            { upsert: true, new: true }
          );
          totalMigrated++;
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }

    console.log(`\n🎉 MIGRATION FINISHED! Total products upserted into MongoDB: ${totalMigrated}`);
    const finalCount = await Product.countDocuments();
    console.log(`Current Total Products in MongoDB: ${finalCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
