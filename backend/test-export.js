// Script test đơn giản để kiểm tra export service
const ExcelJS = require('exceljs');

async function testExcel() {
  try {
    console.log('Testing Excel export...');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Test');
    
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
    ];
    
    sheet.addRow({ id: 1, name: 'Test 1' });
    sheet.addRow({ id: 2, name: 'Test 2' });
    
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('✅ Excel export works! Buffer size:', buffer.length);
    return true;
  } catch (error) {
    console.error('❌ Excel export failed:', error.message);
    return false;
  }
}

async function testPdf() {
  try {
    console.log('\nTesting PDF export...');
    const pdfMake = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    // For pdfmake 0.2.x
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
    
    const docDefinition = {
      content: [
        { text: 'Test PDF', style: 'header' },
        { text: 'This is a test document' }
      ],
      styles: {
        header: { fontSize: 18, bold: true }
      }
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timeout after 5 seconds'));
      }, 5000);
      
      try {
        const pdfDoc = pdfMake.createPdf(docDefinition);
        
        // Try getBase64 instead of getBuffer
        pdfDoc.getBase64((base64String) => {
          clearTimeout(timeout);
          const buffer = Buffer.from(base64String, 'base64');
          console.log('✅ PDF export works! Buffer size:', buffer.length);
          resolve(true);
        }, (error) => {
          clearTimeout(timeout);
          console.error('❌ getBase64 error:', error);
          reject(error);
        });
      } catch (innerError) {
        clearTimeout(timeout);
        console.error('❌ createPdf error:', innerError.message);
        reject(innerError);
      }
    });
  } catch (error) {
    console.error('❌ PDF export failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('=== Testing Export Libraries ===\n');
  
  const excelOk = await testExcel();
  const pdfOk = await testPdf();
  
  console.log('\n=== Results ===');
  console.log('Excel:', excelOk ? '✅ OK' : '❌ FAILED');
  console.log('PDF:', pdfOk ? '✅ OK' : '❌ FAILED');
  
  process.exit(excelOk && pdfOk ? 0 : 1);
}

main();
