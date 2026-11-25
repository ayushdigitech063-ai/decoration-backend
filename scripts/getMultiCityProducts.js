const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function getMultiCityProduct() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Aggregate to find groups with count > 1
  const groups = await mongoose.connection.collection('products').aggregate([
    { $match: { productGroupId: { $exists: true, $ne: '' } } },
    { $group: { _id: "$productGroupId", count: { $sum: 1 }, name: { $first: "$name" }, slug: { $first: "$slug" } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 3 }
  ]).toArray();

  for (const g of groups) {
    console.log(`\n========================================`);
    console.log(`Product Name: ${g.name}`);
    console.log(`Slug: ${g.slug}`);
    console.log(`Product Group ID: ${g._id}`);
    console.log(`Total Cities in DB: ${g.count}`);
    
    const docs = await mongoose.connection.collection('products').find({ productGroupId: g._id }).toArray();
    console.log('Sample City Documents:');
    docs.slice(0, 4).forEach(d => {
      console.log(` -> City: [${d.city}] | Price: ₹${d.price} | Mongo ID: ${d._id}`);
    });
  }

  await mongoose.disconnect();
}

getMultiCityProduct().catch(err => {
  console.error(err);
  process.exit(1);
});
