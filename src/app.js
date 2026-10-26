const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const homePageRoutes = require('./routes/homePageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Dynamic CORS to support localhost & production frontend on Render / Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (mobile, postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      process.env.CLIENT_URL === '*' ||
      !process.env.CLIENT_URL ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route & Health Checks for Render
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Party Square Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Party Square Backend API is running smoothly' });
});

const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const packageRoutes = require('./routes/packageRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const cityRoutes = require('./routes/cityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const settingRoutes = require('./routes/settingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes');
const staffRoutes = require('./routes/staffRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/homepage', homePageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/staff', staffRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
