const mongoose = require('mongoose');
require('dotenv').config();

async function showDatabaseCollections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log(`║     DATABASE COLLECTIONS (${mongoose.connection.name})  ║`);
    console.log('╚════════════════════════════════════════════════╝\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const collName = collection.name;
      const count = await db.collection(collName).countDocuments();
      console.log(`✓ ${collName.padEnd(20)} (${count} documents)`);
    }

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║           SAMPLE DATA FROM EACH COLLECTION     ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    for (const collection of collections) {
      const collName = collection.name;
      const doc = await db.collection(collName).findOne();
      
      console.log(`📌 ${collName}:`);
      if (doc) {
        console.log('  Sample document:');
        console.log('  ' + JSON.stringify(doc, null, 2).split('\n').join('\n  '));
      } else {
        console.log('  (No documents yet)');
      }
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Database inspection complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showDatabaseCollections();
