const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function migrateIndexes() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI missing in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB for index migration...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const productCol = db.collection('products');

  const existingIndexes = await productCol.indexes();
  console.log('Current Product Indexes:', existingIndexes.map(idx => idx.name));

  // 1. Drop old global unique slug index if it exists
  for (const idx of existingIndexes) {
    if (idx.name === 'slug_1' || (idx.key && idx.key.slug === 1 && !idx.key.city)) {
      console.log(`Dropping old index: ${idx.name}...`);
      await productCol.dropIndex(idx.name);
      console.log(`Successfully dropped ${idx.name}`);
    }
  }

  // 2. Ensure new compound unique index: { slug: 1, city: 1 }
  console.log('Creating new compound unique index: { slug: 1, city: 1 }...');
  await productCol.createIndex({ slug: 1, city: 1 }, { unique: true, background: true });
  console.log('Successfully created index: { slug: 1, city: 1 }');

  // 3. Ensure productGroupId index
  console.log('Creating index: { productGroupId: 1, city: 1 }...');
  await productCol.createIndex({ productGroupId: 1, city: 1 }, { background: true });
  console.log('Successfully created index: { productGroupId: 1, city: 1 }');

  // 4. Ensure review index on productGroupId
  const reviewCol = db.collection('reviews');
  console.log('Creating index on reviews: { productGroupId: 1, status: 1 }...');
  await reviewCol.createIndex({ productGroupId: 1, status: 1 }, { background: true });

  const updatedIndexes = await productCol.indexes();
  console.log('Updated Product Indexes:', updatedIndexes.map(idx => idx.name));

  await mongoose.disconnect();
  console.log('INDEX_MIGRATION_COMPLETE');
}

migrateIndexes().catch((err) => {
  console.error('Index migration error:', err);
  process.exit(1);
});
