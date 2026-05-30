import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple test script to verify QR code generation works
 * Run with: npx ts-node test-qr-generation.ts
 */
async function testQRGeneration() {
  console.log('🧪 Testing QR Code Generation...\n');

  try {
    // Test 1: Generate QR code for tree ID 1
    const treeId = 1;
    const qrCodeData = `cayxanh://tree/${treeId}`;
    
    console.log(`📝 Generating QR code for: ${qrCodeData}`);
    
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    // Save to file for visual inspection
    const outputPath = path.join(__dirname, `test-tree-${treeId}-qrcode.png`);
    fs.writeFileSync(outputPath, qrCodeBuffer);
    
    console.log(`✅ QR code generated successfully!`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📊 Buffer size: ${qrCodeBuffer.length} bytes\n`);

    // Test 2: Generate multiple QR codes
    console.log('📝 Generating QR codes for trees 1-5...');
    for (let i = 1; i <= 5; i++) {
      const data = `cayxanh://tree/${i}`;
      const buffer = await QRCode.toBuffer(data, {
        type: 'png',
        width: 200,
        margin: 1,
      });
      const filePath = path.join(__dirname, `test-tree-${i}-qrcode.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`  ✓ Tree ${i}: ${buffer.length} bytes`);
    }

    console.log('\n✅ All tests passed!');
    console.log('💡 You can now scan these QR codes with a QR reader app');
    console.log('   They should show: cayxanh://tree/{id}');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testQRGeneration();
