import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    console.log("Connecting...");
    const client = await pool.connect();
    console.log("✅ Connected successfully");
    
    console.log("Checking tables...");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", res.rows.map(r => r.table_name));
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection error:", err.message);
    process.exit(1);
  }
}

test();
