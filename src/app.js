
const express = require('express');
const cors = require('cors');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const homePageRoutes = require('./routes/homePageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

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
const addOnRoutes = require('./routes/addOnRoutes');

const app = express();

// ===============================
// CORS CONFIGURATION
// ===============================

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin header (Postman, mobile, server-to-server)
    if (!origin) return callback(null, true);

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isVercel = /^https:\/\/.*party-square.*\.vercel\.app$/.test(origin);
    const isCustomDomain = origin.includes('partysquare.in');
    const isClientUrl = process.env.CLIENT_URL && origin === process.env.CLIENT_URL;

    if (isLocalhost || isVercel || isCustomDomain || isClientUrl) {
      return callback(null, true);
    }

    // Allow all other origins in production preview safely
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

// CORS must run before API routes
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// ===============================
// HEALTH CHECK ROUTES
// ===============================

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Party Square Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Party Square Backend API is running smoothly'
  });
});

// ===============================
// API ROUTES
// ===============================

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
app.use('/api/addons', addOnRoutes);

// ===============================
// ERROR HANDLING
// ===============================

app.use(notFound);
app.use(errorHandler);

module.exports = app;
