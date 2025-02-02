const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const Proposal = require('./models/Proposal');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const port = process.env.PORT || 10000;

// Connect to MongoDB with better error handling
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  dbName: 'mystenlabs'
})
.then(() => {
  console.log('Successfully connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error details:', {
    name: err.name,
    message: err.message,
    code: err.code,
    uri: process.env.MONGODB_URI ? 'URI is set' : 'URI is missing'
  });
  console.log('Server will start but database operations will fail');
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to upload to Cloudinary
async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "proposals" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000'   // Alternative local dev
    ].filter(Boolean); // Remove any undefined values
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: {
      mongoDbConfigured: !!process.env.MONGODB_URI,
      cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    }
  });
});

// API Routes
const router = express.Router();

router.get('/proposals', async (req, res) => {
  try {
    console.log('GET /proposals - Checking database connection');
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    console.log('GET /proposals - Fetching proposals from database');
    const proposals = await Proposal.find().sort({ createdAt: -1 });
    console.log(`GET /proposals - Found ${proposals.length} proposals`);
    
    res.json(proposals);
  } catch (error) {
    console.error('GET /proposals - Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/proposals', upload.single('profilePicture'), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    const { name, twitter, website, description, creator_wallet } = req.body;
    
    let imageData = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageData = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    const proposal = new Proposal({
      name,
      twitter,
      website,
      description,
      creator_wallet,
      profilePicture: imageData
    });

    await proposal.save();
    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/proposals/:id/vote', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    const { wallet } = req.body;
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Check if wallet has already voted
    const hasVoted = proposal.votes.some(vote => vote.wallet === wallet);
    if (hasVoted) {
      return res.status(400).json({ error: 'Wallet has already voted' });
    }

    // Add vote
    proposal.votes.push({ wallet });
    await proposal.save();

    res.json(proposal);
  } catch (error) {
    console.error('Error voting:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mount API routes
app.use('/api', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Not Found:', req.method, req.path);
  res.status(404).json({ error: 'Not Found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    port: port,
    mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
    frontendUrl: process.env.FRONTEND_URL || '*',
    cloudinary: {
      cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: !!process.env.CLOUDINARY_API_KEY,
      apiSecret: !!process.env.CLOUDINARY_API_SECRET
    }
  });
});
