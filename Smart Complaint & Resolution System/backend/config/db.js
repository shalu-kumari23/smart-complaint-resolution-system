const mongoose = require('mongoose');
const { seedData } = require('../utils/seed');

let mongodInstance = null;

const connectDB = async () => {
  const customUri = process.env.MONGO_URI;
  const targetUri = customUri || 'mongodb://localhost:27017/smart_complaint_resolution';

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2500 // Fast fail in 2.5s if local mongod is not up
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


