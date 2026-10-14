const mongoose = require('mongoose');
require('dotenv').config();

const Booking = require('../models/Booking');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dubeyshubham0987:dubeyshubham0987@cluster0.gvpex98.mongodb.net/party_square?retryWrites=true&w=majority';

const SEED_BOOKINGS = [
  {
    bookingId: 'BK-9412-108234',
    customerName: 'Aarav Singhania',
    customerEmail: 'aarav.singh@gmail.com',
    customerPhone: '9821034567',
    productName: 'Royal Stage Floral Mandap',
    city: 'Delhi',
    eventDate: '2026-10-24',
    eventTimeSlot: 'Evening (04:00 PM - 08:00 PM)',
    deliveryAddress: 'Grand Orchid Banquet, MG Road, South Delhi',
    specialRequests: 'Imported fresh roses, crystal chandeliers, stage spotlights',
    totalAmount: 18999,
    advanceAmountPaid: 9500,
    onSiteAmountPending: 9499,
    paymentMethod: 'upi',
    transactionId: 'TXN_9412_7719',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-02T14:20:00Z'),
  },
  {
    bookingId: 'BK-7821-492019',
    customerName: 'Priya Mukherjee',
    customerEmail: 'priya.m@yahoo.com',
    customerPhone: '9830145678',
    productName: 'Romantic Candlelight Canopy',
    city: 'Mumbai',
    eventDate: '2026-10-22',
    eventTimeSlot: 'Night (08:00 PM - 12:00 AM)',
    deliveryAddress: 'Sea View Terrace, Bandra West, Mumbai',
    specialRequests: 'Warm fairy lights, rose petal pathway, neon LOVE sign',
    totalAmount: 11499,
    advanceAmountPaid: 5750,
    onSiteAmountPending: 5749,
    paymentMethod: 'card',
    transactionId: 'TXN_7821_4901',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-04T18:30:00Z'),
  },
  {
    bookingId: 'BK-6219-338291',
    customerName: 'Vikram & Sneha Patel',
    customerEmail: 'patel.vikram@outlook.com',
    customerPhone: '9879123456',
    productName: 'Traditional Diya & Flower Decor',
    city: 'Ahmedabad',
    eventDate: '2026-10-28',
    eventTimeSlot: 'Morning (09:00 AM - 01:00 PM)',
    deliveryAddress: 'Bunglow 14, Shivalik Hills, SG Highway, Ahmedabad',
    specialRequests: 'Marigold garlands, brass urli with floating candles',
    totalAmount: 8999,
    advanceAmountPaid: 8999,
    onSiteAmountPending: 0,
    paymentMethod: 'netbanking',
    transactionId: 'TXN_6219_3300',
    paymentStatus: 'FULLY_PAID',
    bookingStatus: 'COMPLETED',
    createdAt: new Date('2026-10-05T11:15:00Z'),
  },
  {
    bookingId: 'BK-5531-901823',
    customerName: 'Rohan Deshmukh',
    customerEmail: 'rohan.desh@gmail.com',
    customerPhone: '9822019283',
    productName: 'Kids Cartoon Balloon Wonderland',
    city: 'Pune',
    eventDate: '2026-10-20',
    eventTimeSlot: 'Afternoon (01:00 PM - 05:00 PM)',
    deliveryAddress: 'Clubhouse, Amanora Park Town, Hadapsar, Pune',
    specialRequests: 'Jungle theme balloons, animal cutouts, customized baby name',
    totalAmount: 7499,
    advanceAmountPaid: 3750,
    onSiteAmountPending: 3749,
    paymentMethod: 'upi',
    transactionId: 'TXN_5531_9120',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-06T16:45:00Z'),
  },
  {
    bookingId: 'BK-4109-881290',
    customerName: 'Neha Kapoor',
    customerEmail: 'neha.kapoor88@gmail.com',
    customerPhone: '9811223344',
    productName: 'Neon Glow Couple Stage',
    city: 'Jaipur',
    eventDate: '2026-10-29',
    eventTimeSlot: 'Evening (05:00 PM - 09:00 PM)',
    deliveryAddress: 'Heritage Haveli Banquet, C-Scheme, Jaipur',
    specialRequests: 'Better Together neon sign, dry ice smoke machine',
    totalAmount: 14999,
    advanceAmountPaid: 7500,
    onSiteAmountPending: 7499,
    paymentMethod: 'upi',
    transactionId: 'TXN_4109_8812',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'IN_PROGRESS',
    createdAt: new Date('2026-10-07T12:00:00Z'),
  },
  {
    bookingId: 'BK-3390-112984',
    customerName: 'Amit Bansal',
    customerEmail: 'amit.bansal@techcorp.in',
    customerPhone: '9899128394',
    productName: 'Corporate Gala & Stage Setup',
    city: 'Gurugram',
    eventDate: '2026-11-02',
    eventTimeSlot: 'Full Day (10:00 AM - 08:00 PM)',
    deliveryAddress: 'Cyber City Tower B, DLF Phase 2, Gurugram',
    specialRequests: 'Company logo stage backdrop, registration desk decor, podium styling',
    totalAmount: 24999,
    advanceAmountPaid: 24999,
    onSiteAmountPending: 0,
    paymentMethod: 'netbanking',
    transactionId: 'TXN_3390_1190',
    paymentStatus: 'FULLY_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-08T09:30:00Z'),
  },
  {
    bookingId: 'BK-2918-773812',
    customerName: 'Ananya Pillai',
    customerEmail: 'ananya.pillai@gmail.com',
    customerPhone: '9847192834',
    productName: 'Ganpati Grand Floral Backdrop',
    city: 'Mumbai',
    eventDate: '2026-10-18',
    eventTimeSlot: 'Morning (08:00 AM - 12:00 PM)',
    deliveryAddress: 'Matunga Central, Near Shivaji Park, Mumbai',
    specialRequests: 'Mogra flower strings, brass bells, modak theme stage',
    totalAmount: 12999,
    advanceAmountPaid: 6500,
    onSiteAmountPending: 6499,
    paymentMethod: 'upi',
    transactionId: 'TXN_2918_7701',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'COMPLETED',
    createdAt: new Date('2026-10-09T15:20:00Z'),
  },
  {
    bookingId: 'BK-1845-662910',
    customerName: 'Kunal Verma',
    customerEmail: 'kunal.verma@gmail.com',
    customerPhone: '9820198273',
    productName: 'Pastel Luxe Balloon Arch',
    city: 'Delhi',
    eventDate: '2026-10-21',
    eventTimeSlot: 'Evening (04:00 PM - 08:00 PM)',
    deliveryAddress: 'House 42, Vasant Vihar, New Delhi',
    specialRequests: 'Chrome gold & sage green organic balloon garland',
    totalAmount: 6499,
    advanceAmountPaid: 3250,
    onSiteAmountPending: 3249,
    paymentMethod: 'upi',
    transactionId: 'TXN_1845_6621',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-10T17:10:00Z'),
  },
  {
    bookingId: 'BK-9912-441029',
    customerName: 'Shalini Sharma',
    customerEmail: 'shalini.s@yahoo.com',
    customerPhone: '9810293847',
    productName: 'Mom Special Golden Canopy',
    city: 'Lucknow',
    eventDate: '2026-10-26',
    eventTimeSlot: 'Evening (05:00 PM - 09:00 PM)',
    deliveryAddress: 'Gomti Nagar Extension, Sector 4, Lucknow',
    specialRequests: 'Golden canopy drapes, memory polaroid photo frame board',
    totalAmount: 8499,
    advanceAmountPaid: 4250,
    onSiteAmountPending: 4249,
    paymentMethod: 'upi',
    transactionId: 'TXN_9912_4409',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-11T13:40:00Z'),
  },
  {
    bookingId: 'BK-8723-559102',
    customerName: 'Gaurav Khanna',
    customerEmail: 'gaurav.k@rediffmail.com',
    customerPhone: '9818293847',
    productName: 'Royal Stage Floral Mandap',
    city: 'Jaipur',
    eventDate: '2026-11-10',
    eventTimeSlot: 'Evening (04:00 PM - 10:00 PM)',
    deliveryAddress: 'Rajvilas Palace Gardens, Jaipur',
    specialRequests: 'Grand entrance archway, royal carpet walkway, chandeliers',
    totalAmount: 22499,
    advanceAmountPaid: 11250,
    onSiteAmountPending: 11249,
    paymentMethod: 'card',
    transactionId: 'TXN_8723_5581',
    paymentStatus: '50%_ADVANCE_PAID',
    bookingStatus: 'CONFIRMED',
    createdAt: new Date('2026-10-12T10:15:00Z'),
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected for Seeding Bookings');

  const user = await User.findOne();
  if (!user) {
    console.error('No user found to associate bookings');
    process.exit(1);
  }

  for (const b of SEED_BOOKINGS) {
    const exists = await Booking.findOne({ bookingId: b.bookingId });
    if (!exists) {
      await Booking.create({
        ...b,
        user: user._id,
      });
      console.log(`Created booking: ${b.bookingId} - ${b.productName} (₹${b.totalAmount})`);
    } else {
      console.log(`Booking already exists: ${b.bookingId}`);
    }
  }

  const count = await Booking.countDocuments();
  console.log(`Total Bookings in Database: ${count}`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
