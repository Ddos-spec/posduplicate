// Generate bcrypt hash for password
const bcrypt = require('bcrypt');

const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log('===========================================');
  console.log('Password Hash Generated');
  console.log('===========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('===========================================');
  console.log('');
  console.log('Use this hash in your seed_data.sql file');
  console.log('Replace: $2b$10$YPszFdXLvKzBIgE8pz.LYOQGZqMxQBj3wOqgZqKqKqKqKqKqKqKqK');
  console.log('With:', hash);
});
