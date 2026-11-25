const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function syncCityToAvailableCities() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find all products that have a specific city assigned
  const products = await mongoose.connection.collection('products').find({
    city: { $exists: true, $ne: '' }
  }).toArray();

  console.log(`Found ${products.length} products to check.`);

  let updatedCount = 0;
  for (const p of products) {
    // If availableCities is not exactly [p.city], sync it so both old and new code see only this city
    if (!p.availableCities || p.availableCities.length !== 1 || p.availableCities[0] !== p.city) {
      await mongoose.connection.collection('products').updateOne(
        { _id: p._id },
        { $set: { availableCities: [p.city] } }
      );
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} products: availableCities set to their exact city.`);
  await mongoose.disconnect();
}

syncCityToAvailableCities().catch(err => {
  console.error(err);
  process.exit(1);
});
