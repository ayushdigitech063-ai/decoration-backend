const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');

async function runBackup() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI missing in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB for backup...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected successfully.');

  const db = mongoose.connection.db;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups', `snapshot_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = ['products', 'reviews', 'bookings', 'cities', 'packages'];
  const summary = {};

  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      const docs = await col.find({}).toArray();
      const filePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      summary[colName] = docs.length;
      console.log(`Backed up ${docs.length} documents from "${colName}" -> ${filePath}`);
    } catch (err) {
      console.warn(`Collection "${colName}" not found or empty: ${err.message}`);
      summary[colName] = 0;
    }
  }

  const metaPath = path.join(backupDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    timestamp,
    counts: summary,
    dbName: db.databaseName,
    backupDir
  }, null, 2), 'utf8');

  console.log('BACKUP_COMPLETE', JSON.stringify(summary));
  console.log('Backup Directory:', backupDir);
  await mongoose.disconnect();
}

runBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
