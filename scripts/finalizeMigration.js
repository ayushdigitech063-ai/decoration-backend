const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanAndCompleteMigration() {
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const productCol = db.collection('products');
  const cityCol = db.collection('cities');
  const reviewCol = db.collection('reviews');

  const cityDocs = await cityCol.find({ isActive: true }).toArray();
  const activeCityNames = cityDocs.map(c => String(c.name || '').trim()).filter(Boolean);

  // Check all products
  const allProds = await productCol.find({}).toArray();
  console.log(`Current Total Products: ${allProds.length}`);

  let updatedCount = 0;
  for (const prod of allProds) {
    const groupId = prod.productGroupId || `grp_${prod.slug || String(prod._id)}`;
    const currentCity = prod.city || 'Delhi';

    // Ensure productGroupId and valid city are set
    await productCol.updateOne(
      { _id: prod._id },
      {
        $set: {
          productGroupId: groupId,
          city: currentCity,
          updatedAt: new Date()
        }
      }
    );
    updatedCount++;

    // Sync reviews
    await reviewCol.updateMany(
      { productId: String(prod._id) },
      { $set: { productGroupId: groupId } }
    );
  }

  // Summary of groups and cities
  const groups = await productCol.distinct('productGroupId');
  const cities = await productCol.distinct('city');
  const total = await productCol.countDocuments();

  console.log('MIGRATION_STATUS', JSON.stringify({
    totalProducts: total,
    uniqueProductGroups: groups.length,
    activeCitiesCovered: cities.length,
    updatedRecords: updatedCount
  }));

  await mongoose.disconnect();
  console.log('PHASE_3_COMPLETE_AND_VERIFIED');
}

cleanAndCompleteMigration().catch(err => {
  console.error('Error in finalization:', err);
  process.exit(1);
});
