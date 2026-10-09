const express = require('express');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const homePageRoutes = require('./routes/homePageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,}
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Party Square Backend API is running smoothly' });
});

const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const packageRoutes = require('./routes/packageRoutes');
const cityRoutes = require('./routes/cityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const settingRoutes = require('./routes/settingRoutes');

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
app.use('/api/cities', cityRoutes);
app.use('/api/bookings', bookingRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
