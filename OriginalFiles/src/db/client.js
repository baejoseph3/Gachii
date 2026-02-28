import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        // Force verify-full mode for future compatibility
        sslmode: 'verify-full'
    }
});

export default pool;