const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function migrateProducts() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI missing');
    process.exit(1);
  }

  console.log('Connecting to MongoDB for Product Data Migration...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const productCol = db.collection('products');
  const cityCol = db.collection('cities');
  const reviewCol = db.collection('reviews');

  // Fetch active cities
  const cityDocs = await cityCol.find({ isActive: true }).toArray();
  const activeCityNames = cityDocs.length > 0
    ? cityDocs.map(c => String(c.name || '').trim()).filter(Boolean)
    : ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Jaipur', 'Pune'];
  console.log(`Loaded ${activeCityNames.length} active cities for distribution.`);

  const existingProducts = await productCol.find({}).toArray();
  console.log(`Found ${existingProducts.length} existing products in database.`);

  let updatedCount = 0;
  let clonedCount = 0;
  let skippedCount = 0;

  for (const prod of existingProducts) {
    // 1. Assign or reuse productGroupId
    const groupId = prod.productGroupId || `grp_${prod.slug || String(prod._id)}`;

    // Determine target cities from availableCities safely
    let targetCities = [];
    if (Array.isArray(prod.availableCities) && prod.availableCities.length > 0) {
      const hasAll = prod.availableCities.some(c => String(c).toLowerCase() === 'all');
      if (hasAll) {
        targetCities = [...activeCityNames];
      } else {
        targetCities = prod.availableCities
          .map(c => (typeof c === 'string' ? c.trim() : (c && c.name ? String(c.name).trim() : String(c || '').trim())))
          .filter(Boolean);
      }
    }

    if (targetCities.length === 0) {
      targetCities = [prod.city || 'Delhi'];
    }

    // First city goes to the existing document to preserve original _id
    const primaryCity = targetCities[0] || 'Delhi';
    
    await productCol.updateOne(
      { _id: prod._id },
      {
        $set: {
          city: primaryCity,
          productGroupId: groupId,
          updatedAt: new Date()
        }
      }
    );
    updatedCount++;

    // Update reviews linked to this original product
    await reviewCol.updateMany(
      { productId: String(prod._id) },
      { $set: { productGroupId: groupId } }
    );

    // If product had multiple target cities, create city-specific clone documents
    const remainingCities = targetCities.slice(1);
    for (const city of remainingCities) {
      // Check if duplicate already exists for this city
      const alreadyExists = await productCol.findOne({
        slug: prod.slug,
        city: city
      });

      if (!alreadyExists) {
        const cloneDoc = {
          ...prod,
          _id: new mongoose.Types.ObjectId(),
          city: city,
          productGroupId: groupId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await productCol.insertOne(cloneDoc);
        clonedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  const finalCount = await productCol.countDocuments();
  console.log('MIGRATION_SUMMARY', JSON.stringify({
    initialProducts: existingProducts.length,
    updatedPrimary: updatedCount,
    clonedAdditionalCities: clonedCount,
    skippedDuplicates: skippedCount,
    totalFinalProducts: finalCount
  }));

  await mongoose.disconnect();
  console.log('PHASE_3_PRODUCT_MIGRATION_COMPLETE');
}

migrateProducts().catch((err) => {
  console.error('Data migration error:', err);
  process.exit(1);
});
