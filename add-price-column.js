/**
 * Add price column to Course table
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPriceColumn() {
  try {
    console.log('🔧 Adding price column to Course table...');
    
    // Add price column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Course\` 
      ADD COLUMN \`price\` DOUBLE NOT NULL DEFAULT 0;
    `);
    
    console.log('✅ Price column added successfully!');
  } catch (error) {
    // If column already exists, that's OK
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('ℹ️  Price column already exists, skipping...');
    } else {
      console.error('❌ Error adding price column:', error.message);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addPriceColumn()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
