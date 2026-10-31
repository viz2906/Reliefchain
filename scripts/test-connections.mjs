import pg from 'pg';
import { MongoClient } from 'mongodb';

const { Pool } = pg;

async function testAll() {
  console.log('Testing PostgreSQL connection...');
  const pool = new Pool({
    connectionString: 'postgresql://relief_admin:relief_secret_password@localhost:5432/reliefchain_db'
  });
  const pgRes = await pool.query('SELECT current_database(), current_user, version();');
  console.log('PostgreSQL OK:', pgRes.rows[0]);
  await pool.end();

  console.log('\nTesting MongoDB connection...');
  const mongo = new MongoClient('mongodb://localhost:27017/reliefchain_logs');
  await mongo.connect();
  const db = mongo.db('reliefchain_logs');
  const collections = await db.listCollections().toArray();
  console.log('MongoDB OK. Collections:', collections.map(c => c.name));
  await mongo.close();
  console.log('\nAll Database paradigms online and operational!');
}

testAll().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
