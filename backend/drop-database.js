/**
 * Drop Database Script
 * Deletes the database pointed to by MONGODB_URI (or the default local DB)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietary-monitoring';

async function dropDatabase() {
  try {
    console.log('⚠️  WARNING: This will delete the entire database!');
    console.log(`🎯 Target URI: ${MONGODB_URI}\n`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const connectedDbName = mongoose.connection?.db?.databaseName || '(unknown)';
    console.log(`🧭 Connected DB: ${connectedDbName}\n`);
    
    await mongoose.connection.dropDatabase();
    console.log(`🗑️  Database "${connectedDbName}" deleted successfully!\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

dropDatabase();
