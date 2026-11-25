const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getSampleProducts() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find a product group that has multiple city documents
  const sample = await mongoose.connection.collection('products').findOne({
    productGroupId: { $exists: true, $ne: '' }
  });

  if (sample) {
    const allInGroup = await mongoose.connection.collection('products').find({
      productGroupId: sample.productGroupId
    }).toArray();

    console.log('--- SAMPLE PRODUCT GROUP ---');
    console.log('Group ID:', sample.productGroupId);
    console.log('Name:', sample.name);
    console.log('Slug:', sample.slug);
    console.log('Total Cities available:', allInGroup.length);
    console.log('Cities & IDs:');
    allInGroup.slice(0, 5).forEach(p => {
      console.log(`- City: ${p.city} | Price: ₹${p.price} | ID: ${p._id} | Slug: ${p.slug}`);
    });
  }

  await mongoose.disconnect();
}

getSampleProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
