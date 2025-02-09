// db.js
const mysql = require('mysql2/promise');
const maxRetries = 5;
const retryInterval = 5000;

async function connectWithRetry(retries = maxRetries) {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('Successfully connected to MySQL database');
        return connection;
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
        
        if (retries > 0) {
            console.log(`Retrying in ${retryInterval/1000} seconds... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            return connectWithRetry(retries - 1);
        }
        
        throw new Error('Failed to connect to database after multiple attempts');
    }
}

module.exports = { connectWithRetry };