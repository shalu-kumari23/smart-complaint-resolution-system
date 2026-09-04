const mongoose = require('mongoose');
const { seedData } = require('../utils/seed');

let mongodInstance = null;

const connectDB = async () => {
  const customUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';
  const targetUri = customUri || 'mongodb://localhost:27017/smart_complaint_resolution';

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 10000 // 10s timeout for Atlas TLS connection
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    
    // Auto-seed if database is empty
    const User = require('../models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty, auto-seeding demo users and complaints...');
      await seedData(true);
      console.log('✅ Auto-seeding completed.');
    }
  } catch (error) {
    console.warn(`⚠️ Could not connect to primary MongoDB (${targetUri}): ${error.message}`);
    
    if (customUri || isProduction) {
      console.error(`❌ Please check that your MONGO_URI is correct and IP 0.0.0.0/0 is allowed in MongoDB Atlas Network Access.`);
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


