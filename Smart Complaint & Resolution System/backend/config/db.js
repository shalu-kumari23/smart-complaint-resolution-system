const mongoose = require('mongoose');
const { seedData } = require('../utils/seed');

let mongodInstance = null;

// Helper to sanitize URI for safe logging
const sanitizeUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/(.*?):(.*?)@/, '//$1:****@');
};

// Helper to clean, trim, and format Mongo URI
const cleanMongoUri = (rawUri) => {
  if (!rawUri) return '';
  let uri = rawUri.trim();
  // Remove wrapping quotes if present
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // Ensure target database name exists in the path if connecting to Atlas
  if (uri.startsWith('mongodb+srv://') && !uri.includes('/smart_complaint_resolution')) {
    if (uri.includes('/?')) {
      uri = uri.replace('/?', '/smart_complaint_resolution?');
    } else if (uri.endsWith('/')) {
      uri = uri + 'smart_complaint_resolution';
    } else if (!uri.split('?')[0].includes('.net/')) {
      // e.g. mongodb+srv://...mongodb.net
      const parts = uri.split('?');
      uri = parts[0] + '/smart_complaint_resolution' + (parts[1] ? `?${parts[1]}` : '');
    }
  }

  return uri;
};

const connectDB = async () => {
  const rawCustomUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';
  const customUri = cleanMongoUri(rawCustomUri);
  const targetUri = customUri || 'mongodb://localhost:27017/smart_complaint_resolution';

  const connectionOptions = {
    serverSelectionTimeoutMS: 15000, // 15s timeout for Atlas TLS handshake
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    family: 4 // Force IPv4 on Linux cloud containers
  };

  const maxRetries = customUri ? 3 : 1;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retrying MongoDB connection (Attempt ${attempt}/${maxRetries})...`);
      }

      const conn = await mongoose.connect(targetUri, connectionOptions);
      console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);

      // Setup connection lifecycle event listeners
      mongoose.connection.on('error', (err) => {
        console.error(`❌ MongoDB connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn(`⚠️ MongoDB connection lost.`);
      });

      // Auto-seed if database is empty
      try {
        const User = require('../models/User');
        const count = await User.countDocuments();
        if (count === 0) {
          console.log('🌱 Database is empty, auto-seeding demo users and complaints...');
          await seedData(true);
          console.log('✅ Auto-seeding completed.');
        }
      } catch (seedErr) {
        console.warn(`⚠️ Auto-seeding check skipped: ${seedErr.message}`);
      }

      return; // Successfully connected
    } catch (error) {
      console.warn(`⚠️ MongoDB connection attempt ${attempt} failed (${sanitizeUri(targetUri)}): ${error.message}`);

      if (attempt < maxRetries) {
        // Wait 3 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        // Final attempt failed
        if (customUri || isProduction) {
          console.error(`❌ Atlas Connection Failed.`);
          console.error(`👉 Troubleshooting:`);
          console.error(`1. Whitelist all IPs: MongoDB Atlas -> Network Access -> Add IP Address -> 'Allow Access from Anywhere' (0.0.0.0/0) -> Confirm.`);
          console.error(`2. Password check: Ensure your MongoDB password does not contain unescaped special characters (e.g. '@', ':', '/') in MONGO_URI.`);
          console.error(`3. Verify MONGO_URI in Render Environment Variables matches: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smart_complaint_resolution?retryWrites=true&w=majority`);
          return;
        }

        // Local development fallback to embedded in-memory MongoDB
        console.log(`🔄 Starting embedded In-Memory MongoDB Server so backend works automatically without external setup...`);
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          mongodInstance = await MongoMemoryServer.create();
          const inMemoryUri = mongodInstance.getUri();

          const conn = await mongoose.connect(inMemoryUri, { family: 4 });
          console.log(`✅ Embedded In-Memory MongoDB running at: ${conn.connection.host}`);

          console.log('🌱 Auto-seeding demo data into In-Memory database...');
          await seedData(true);
          console.log('✅ Demo accounts & complaints ready to use!');
        } catch (fallbackError) {
          console.error(`❌ In-Memory MongoDB fallback failed: ${fallbackError.message}`);
        }
      }
    }
  }
};

module.exports = connectDB;
