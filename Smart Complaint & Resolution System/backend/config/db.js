const mongoose = require('mongoose');
const { seedData } = require('../utils/seed');

let mongodInstance = null;

// Helper to mask credentials in connection logs
const sanitizeUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/(.*?):(.*?)@/, '//$1:****@');
};

const connectDB = async () => {
  const customUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';
  const targetUri = customUri || 'mongodb://localhost:27017/smart_complaint_resolution';

  // Setup Mongoose connection lifecycle event listeners
  mongoose.connection.on('connected', () => {
    console.log(`✅ MongoDB Connected to: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn(`⚠️ MongoDB disconnected.`);
  });

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 10000, // 10s timeout for Atlas TLS connection
      maxPoolSize: 10,
      socketTimeoutMS: 45000
    });
    
    // Auto-seed if database is empty
    const User = require('../models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty, auto-seeding demo users and complaints...');
      await seedData(true);
      console.log('✅ Auto-seeding completed.');
    }
  } catch (error) {
    console.warn(`⚠️ Could not connect to primary MongoDB (${sanitizeUri(targetUri)}): ${error.message}`);
    
    if (customUri || isProduction) {
      console.error(`❌ Atlas Connection Failed. Common cause: Render IP is not whitelisted in MongoDB Atlas.`);
      console.error(`👉 Fix: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Select 'Allow Access from Anywhere' (0.0.0.0/0) -> Confirm.`);
      return;
    }

    console.log(`🔄 Starting embedded In-Memory MongoDB Server so backend works automatically without external setup...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const inMemoryUri = mongodInstance.getUri();
      
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`✅ Embedded In-Memory MongoDB running at: ${conn.connection.host}`);
      
      console.log('🌱 Auto-seeding demo data into In-Memory database...');
      await seedData(true);
      console.log('✅ Demo accounts & complaints ready to use!');
    } catch (fallbackError) {
      console.error(`❌ In-Memory MongoDB fallback failed: ${fallbackError.message}`);
    }
  }
};

module.exports = connectDB;



