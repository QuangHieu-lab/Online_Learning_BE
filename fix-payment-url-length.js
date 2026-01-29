/**
 * Fix Payment table: Change paymentUrl and vnpayMessage to TEXT
 * Run this script to apply the migration manually
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPaymentUrlLength() {
  try {
    console.log('🔧 Fixing Payment table: changing paymentUrl and vnpayMessage to TEXT...');
    
    // Run SQL migration
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Payment\` 
      MODIFY COLUMN \`paymentUrl\` TEXT NULL,
      MODIFY COLUMN \`vnpayMessage\` TEXT NULL;
    `);
    
    console.log('✅ Migration applied successfully!');
    console.log('   - paymentUrl: VARCHAR -> TEXT');
    console.log('   - vnpayMessage: VARCHAR -> TEXT');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentUrlLength()
  .then(() => {
    console.log('\n✨ Done! You can now test the payment flow.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
