/**
 * Script untuk membuat Super Admin User (Prisma Version)
 *
 * Usage:
 * npm run create:admin
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@mypos.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Super Admin';
const SALT_ROUNDS = 10;

async function createAdminUser() {
  try {
    console.log('🚀 Starting admin user creation...\n');

    // Step 1: Create or get Super Admin role
    console.log('📋 Step 1: Creating/Getting Super Admin role...');
    const role = await prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: {
        permissions: {
          full_access: true,
          system: {
            access_admin_panel: true,
            manage_tenants: true,
            manage_subscriptions: true,
            view_system_analytics: true,
            manage_billing: true
          }
        },
        updatedAt: new Date()
      },
      create: {
        name: 'Super Admin',
        permissions: {
          full_access: true,
          system: {
            access_admin_panel: true,
            manage_tenants: true,
            manage_subscriptions: true,
            view_system_analytics: true,
            manage_billing: true
          }
        }
      }
    });

    console.log(`✅ Role created/updated: ${role.name} (ID: ${role.id})\n`);

    // Step 2: Hash password
    console.log('🔐 Step 2: Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log(`✅ Password hashed successfully\n`);

    // Step 3: Create or update admin user
    console.log('👤 Step 3: Creating/Updating admin user...');
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        passwordHash: passwordHash,
        name: ADMIN_NAME,
        roleId: role.id,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        email: ADMIN_EMAIL,
        passwordHash: passwordHash,
        name: ADMIN_NAME,
        roleId: role.id,
        tenantId: null,
        outletId: null,
        isActive: true
      }
    });

    console.log(`✅ Admin user created/updated successfully!\n`);

    // Step 4: Verify
    console.log('🔍 Step 4: Verifying admin user...');
    const verifiedAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: {
        roles: true
      }
    });

    if (verifiedAdmin) {
      console.log('\n✅ VERIFICATION SUCCESSFUL!');
      console.log('==========================================');
      console.log('Admin User Details:');
      console.log('==========================================');
      console.log(`ID:       ${verifiedAdmin.id}`);
      console.log(`Email:    ${verifiedAdmin.email}`);
      console.log(`Name:     ${verifiedAdmin.name}`);
      console.log(`Role:     ${verifiedAdmin.roles.name}`);
      console.log(`Active:   ${verifiedAdmin.isActive}`);
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
    await prisma.$disconnect();
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
