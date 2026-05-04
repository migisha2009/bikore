require('dotenv').config();
const pool = require('./src/db');

async function checkUsers() {
  try {
    const { rows } = await pool.query('SELECT phone, name FROM users LIMIT 5');
    console.log('Available users:');
    rows.forEach(user => {
      console.log(`- ${user.name}: ${user.phone}`);
    });
  } catch (error) {
    console.error('Error checking users:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers();
