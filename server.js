const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
const { errorHandler } = require('./middleware/errorHandler');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy - required for rate limiting behind Vercel
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        ...(process.env.NODE_ENV === 'development' 
          ? ['http://localhost:5000'] 
          : ['https://apna-backend.vercel.app']),
        'https://api.stripe.com',
        'https://r.stripe.com',
        'https://hooks.stripe.com'
      ],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://apna-backend.vercel.app'],
      fontSrc: ["'self'", 'data:', 'https:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    },
    useDefaults: false
  }
}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Set CSP headers directly
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:5000 https://apna-backend.vercel.app https://api.stripe.com https://r.stripe.com https://hooks.stripe.com https://apna-store-frontend.vercel.app https://admin-page-azure-three.vercel.app https://store-1-c7uw.vercel.app; " +
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob: https://apna-backend.vercel.app; " +
    "font-src 'self' data: https: https://fonts.gstatic.com; " +
    "frame-ancestors 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/auth/google' // Skip rate limiting for Google auth
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
console.log(process.env.NODE_ENV);
// CORS configuration
const corsOptions = {
  origin: [
    'https://store-1-c7uw.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://apna-store-frontend.vercel.app',
    'https://admin-page-azure-three.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(','));
  res.setHeader('Access-Control-Max-Age', corsOptions.maxAge);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log('=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('=====================');
  next();
});

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  store: process.env.NODE_ENV === 'production' 
    ? new (require('connect-mongo'))({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 24 hours
      })
    : undefined
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Add request body logging middleware
app.use((req, res, next) => {
  console.log('Request body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const blogUploadsDir = path.join(uploadsDir, 'blog');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(blogUploadsDir)) {
  fs.mkdirSync(blogUploadsDir);
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection with retry logic
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');

    // Seed the database if it's empty
    const Product = require('./models/Product');
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Database is empty, seeding products...');
      const seedProducts = require('./seed/products');
      await seedProducts();
      console.log('Products seeded successfully');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Retry connection after 5 seconds
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Add mongoose connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
  // Attempt to reconnect
  setTimeout(connectDB, 5000);
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during mongoose connection closure:', err);
    process.exit(1);
  }
});

// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const blogRoutes = require('./routes/blogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Log route registration
console.log('=== Registering Routes ===');

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Log all registered routes
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log('Registered route:', r.route.stack[0].method.toUpperCase(), r.route.path);
    }
});

console.log('=== Routes Registration Complete ===');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Define a route for the home page
app.get('/', (req, res) => {
    res.render('index');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('=== Error Details ===');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request Method:', req.method);
  console.error('Request Body:', req.body);
  console.error('===================');
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Handle 404 errors
app.use((req, res) => {
  console.log('404 Not Found:', req.url);
  res.status(404).json({
    message: 'Route not found',
    path: req.url
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  // Don't exit the process, let it retry
  console.log('Will retry connection...');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start server only after MongoDB connection is established
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 
