const pool = require('./src/db');
const bcrypt = require('bcryptjs');

const demoUsers = [
  {
    name: 'Amina Uwimana',
    phone: '+250788100001',
    password: 'password123',
    email: 'amina@example.com',
  },
  {
    name: 'Jean Niyonzima',
    phone: '+250788100002',
    password: 'password123',
    email: 'jean@example.com',
  },
  {
    name: 'Grace Mukamana',
    phone: '+250788100003',
    password: 'password123',
    email: 'grace@example.com',
  },
];

const demoGroups = [
  {
    name: 'Family Savings',
    description: 'Monthly savings for family emergencies and celebrations',
    emoji: '🏠',
    contribution_amount: 50000,
    cycle_duration: 'monthly',
    total_cycles: 12,
  },
  {
    name: 'Business Investment',
    description: 'Group investment in small business opportunities',
    emoji: '💼',
    contribution_amount: 100000,
    cycle_duration: 'monthly',
    total_cycles: 6,
  },
  {
    name: 'Education Fund',
    description: 'Savings for children\'s school fees and educational expenses',
    emoji: '🎓',
    contribution_amount: 75000,
    cycle_duration: 'monthly',
    total_cycles: 10,
  },
];

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Seeding Bikore database...');
    
    // Insert demo users
    const insertedUsers = [];
    for (const user of demoUsers) {
      const password_hash = await bcrypt.hash(user.password, 10);
      const { rows } = await client.query(
        'INSERT INTO users (name, phone, email, password_hash, avatar_color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user.name, user.phone, user.email, password_hash, '#2C4A2E']
      );
      insertedUsers.push(rows[0]);
      console.log(`✅ Created user: ${user.name}`);
    }
    
    // Insert demo groups
    const insertedGroups = [];
    for (let i = 0; i < demoGroups.length; i++) {
      const group = demoGroups[i];
      const admin = insertedUsers[i % insertedUsers.length];
      const code = group.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) + Math.floor(1000 + Math.random() * 9000);
      
      const { rows } = await client.query(
        'INSERT INTO groups (name, description, emoji, contribution_amount, cycle_duration, total_cycles, admin_id, invite_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [group.name, group.description, group.emoji, group.contribution_amount, group.cycle_duration, group.total_cycles, admin.id, code]
      );
      insertedGroups.push(rows[0]);
      console.log(`✅ Created group: ${group.name} (Code: ${code})`);
    }
    
    // Add members to groups
    for (let i = 0; i < insertedGroups.length; i++) {
      const group = insertedGroups[i];
      
      // Add all users to each group with different positions
      for (let j = 0; j < insertedUsers.length; j++) {
        const user = insertedUsers[j];
        const position = j + 1;
        
        await client.query(
          'INSERT INTO members (group_id, user_id, position) VALUES ($1, $2, $3)',
          [group.id, user.id, position]
        );
        console.log(`✅ Added ${user.name} to ${group.name} at position ${position}`);
      }
      
      // Create first cycle
      await client.query(
        'INSERT INTO cycles (group_id, cycle_number, payout_user_id, start_date, status) VALUES ($1, 1, $2, NOW(), $3)',
        [group.id, insertedUsers[0].id, 'active']
      );
      
      // Add some demo contributions
      for (let j = 0; j < 2; j++) {
        const user = insertedUsers[j];
        await client.query(
          'INSERT INTO contributions (cycle_id, group_id, user_id, amount, method, status, paid_at) SELECT id, $1, $2, $3, $4, $5, NOW() FROM cycles WHERE group_id = $1 AND status = $6 LIMIT 1',
          [group.id, user.id, group.contribution_amount, 'MTN MoMo', 'paid', 'active']
        );
        console.log(`✅ Added contribution for ${user.name} in ${group.name}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('🎉 Database seeded successfully!');
    console.log('\n📱 Demo Credentials:');
    demoUsers.forEach(user => {
      console.log(`   ${user.name}: ${user.phone} / ${user.password}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
