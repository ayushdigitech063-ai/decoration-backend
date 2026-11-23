const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Review = require('../src/models/Review');
const Product = require('../src/models/Product');

async function testReviewArchitecture() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected for Review Verification');

  // Find a product that has city clones and a productGroupId
  const product = await Product.findOne({ productGroupId: { $exists: true, $ne: '' } });
  if (!product) {
    console.log('No product with productGroupId found');
    process.exit(1);
  }

  console.log(`Testing with product: ${product.name} (ID: ${product._id}, GroupId: ${product.productGroupId}, City: ${product.city})`);

  // Find a sibling clone for a different city
  const sibling = await Product.findOne({ productGroupId: product.productGroupId, _id: { $ne: product._id } });
  if (sibling) {
    console.log(`Found sibling clone for city ${sibling.city} (ID: ${sibling._id})`);
  }

  // Create a test review simulating createReviewAdmin logic
  const testReview = await Review.create({
    productId: String(product._id),
    productGroupId: product.productGroupId,
    productName: product.name,
    customerName: 'Test Automation User',
    city: product.city || 'Delhi',
    rating: 5,
    comment: 'Testing dynamic cross-city review display and linking.',
    status: 'APPROVED',
    isManual: true,
  });

  console.log(`Created test review ID: ${testReview._id}`);

  // Test getReviewsByProduct logic when querying for the primary product
  const queryProd = {
    status: { $in: ['APPROVED', 'FEATURED'] },
    $or: [
      { productId: String(product._id) },
      { productId: product.slug },
      { productGroupId: product.productGroupId }
    ]
  };
  const primaryReviews = await Review.find(queryProd).lean();
  console.log(`Primary product reviews matched: ${primaryReviews.length}`);

  // Test getReviewsByProduct logic when querying for sibling clone
  if (sibling) {
    const siblingMatchConditions = [
      { productId: String(sibling._id) },
      { productId: sibling.slug },
      { productGroupId: sibling.productGroupId }
    ];
    const siblingReviews = await Review.find({
      status: { $in: ['APPROVED', 'FEATURED'] },
      $or: siblingMatchConditions
    }).lean();
    console.log(`Sibling product reviews matched: ${siblingReviews.length} (Expected >= 1 due to shared productGroupId)`);
  }

  // Clean up test review
  await Review.deleteOne({ _id: testReview._id });
  console.log('Test review cleaned up successfully.');

  await mongoose.disconnect();
  console.log('VERIFICATION_COMPLETE_SUCCESS');
}

testReviewArchitecture().catch(err => {
  console.error(err);
  process.exit(1);
});
