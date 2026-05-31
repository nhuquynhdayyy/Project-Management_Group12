import { DataSource, DataSourceOptions } from 'typeorm';
import { Tree } from '../../entities/tree.entity';

/**
 * Script to update qr_code field for all existing trees
 * Run with: npx ts-node src/database/scripts/update-qr-codes.ts
 */
async function updateQRCodes() {
  const dbType = process.env.DB_TYPE || 'postgres';
  
  let dataSourceOptions: DataSourceOptions;
  
  if (dbType === 'sqlite') {
    dataSourceOptions = {
      type: 'sqlite',
      database: process.env.DB_NAME || 'database.sqlite',
      entities: [Tree],
      synchronize: false,
    };
  } else {
    dataSourceOptions = {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'cayxanh',
      entities: [Tree],
      synchronize: false,
    };
  }

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const treeRepository = dataSource.getRepository(Tree);
    const trees = await treeRepository.find();

    console.log(`Found ${trees.length} trees to update`);

    let updatedCount = 0;
    for (const tree of trees) {
      if (!tree.qr_code || tree.qr_code === '') {
        tree.qr_code = `cayxanh://tree/${tree.id}`;
        await treeRepository.save(tree);
        updatedCount++;
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} trees with QR codes`);
    console.log(`ℹ️  ${trees.length - updatedCount} trees already had QR codes`);
  } catch (error) {
    console.error('❌ Error updating QR codes:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateQRCodes();
