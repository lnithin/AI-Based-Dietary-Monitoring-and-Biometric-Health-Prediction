#!/usr/bin/env node

/**
 * MongoDB Connection Test & Setup
 * Use this to verify your MongoDB Atlas connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  console.log('🔗 Testing MongoDB Connection...\n');
  console.log(`📍 URI: ${process.env.MONGODB_URI}\n`);

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ MongoDB Connected Successfully!\n');
    console.log(`📊 Connection Details:`);
    console.log(`   • Host: ${conn.connection.host}`);
    console.log(`   • Port: ${conn.connection.port}`);
    console.log(`   • Database: ${conn.connection.name}\n`);

    // List all databases
    const admin = conn.connection.getClient().db().admin();
    const databases = await admin.listDatabases();
    
    console.log(`📚 Available Databases:`);
    databases.databases.forEach(db => {
      console.log(`   • ${db.name}`);
    });

    // Check collections in current database
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`\n📋 Collections in '${conn.connection.name}':`);
    
    if (collections.length === 0) {
      console.log('   (No collections yet)');
    } else {
      collections.forEach(col => {
        console.log(`   • ${col.name}`);
      });
    }

    console.log('\n✅ Connection successful! You can now use MongoDB.\n');
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Connection Failed!\n');
    console.error(`Error: ${error.message}\n`);
    console.log('💡 Troubleshooting Tips:');
    console.log('   1. Check your MongoDB URI in .env file');
    console.log('   2. Verify username and password are correct');
    console.log('   3. Add your IP address to MongoDB Atlas whitelist');
    console.log('   4. Ensure cluster is running (not paused)');
    console.log('   5. Check internet connection\n');
    process.exit(1);
  }
};

testConnection();
