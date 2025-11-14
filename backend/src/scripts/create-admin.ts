/**
 * Script untuk membuat Super Admin User
 *
 * Usage:
 * npx ts-node src/scripts/create-admin.ts
 *
 * Atau tambahkan di package.json:
 * "scripts": {
 *   "create:admin": "ts-node src/scripts/create-admin.ts"
 * }
 *
 * Kemudian jalankan: npm run create:admin
 */

import pool from '../config/database';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'admin@mypos.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Super Admin';
const SALT_ROUNDS = 10;

async function createAdminUser() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting admin user creation...\n');

    // Step 1: Create or get Super Admin role
    console.log('📋 Step 1: Creating/Getting Super Admin role...');
    const roleResult = await client.query(
      `INSERT INTO roles (name, permissions, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (name)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, name`,
      [
        'Super Admin',
        JSON.stringify({
          full_access: true,
          system: {
            access_admin_panel: true,
            manage_tenants: true,
            manage_subscriptions: true,
            view_system_analytics: true,
            manage_billing: true
          }
        })
      ]
    );

    const roleId = roleResult.rows[0].id;
    console.log(`✅ Role created/updated: ${roleResult.rows[0].name} (ID: ${roleId})\n`);

    // Step 2: Hash password
    console.log('🔐 Step 2: Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log(`✅ Password hashed successfully\n`);

    // Step 3: Create or update admin user
    console.log('👤 Step 3: Creating/Updating admin user...');
    const userResult = await client.query(
      `INSERT INTO users (
        tenant_id,
        email,
        password_hash,
        name,
        role_id,
        outlet_id,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role_id = EXCLUDED.role_id,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name`,
      [
        null, // tenant_id (Super Admin tidak punya tenant)
        ADMIN_EMAIL,
        passwordHash,
        ADMIN_NAME,
        roleId,
        null, // outlet_id (Super Admin tidak terikat outlet)
        true
      ]
    );

    const admin = userResult.rows[0];
    console.log(`✅ Admin user created/updated successfully!\n`);

    // Step 4: Verify
    console.log('🔍 Step 4: Verifying admin user...');
    const verifyResult = await client.query(
      `SELECT u.id, u.email, u.name, r.name as role_name, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [ADMIN_EMAIL]
    );

    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('\n✅ VERIFICATION SUCCESSFUL!');
      console.log('==========================================');
      console.log('Admin User Details:');
      console.log('==========================================');
      console.log(`ID:       ${user.id}`);
      console.log(`Email:    ${user.email}`);
      console.log(`Name:     ${user.name}`);
      console.log(`Role:     ${user.role_name}`);
      console.log(`Active:   ${user.is_active}`);
      console.log('==========================================');
      console.log('\n📧 Login Credentials:');
      console.log('==========================================');
      console.log(`URL:      http://localhost:5173/admin/login`);
      console.log(`Email:    ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      console.log('==========================================\n');
      console.log('🎉 Admin user is ready to use!');
    } else {
      console.error('❌ Verification failed - admin user not found!');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute script
createAdminUser()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });
