const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixReviewIndex() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  try {
    await mongoose.connection.collection('reviews').dropIndex('booking_1_user_1');
    console.log('Dropped old index: booking_1_user_1');
  } catch (err) {
    console.log('Index drop note:', err.message);
  }

  // Re-create as partial unique index so null booking & user (e.g. manual admin reviews) don't collide
  await mongoose.connection.collection('reviews').createIndex(
    { booking: 1, user: 1 },
    {
      unique: true,
      partialFilterExpression: {
        booking: { $type: 'objectId' },
        user: { $type: 'objectId' },
      },
      name: 'booking_1_user_1',
    }
  );

  console.log('Successfully created partial unique index on { booking: 1, user: 1 }');
  await mongoose.disconnect();
}

fixReviewIndex().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
