const https = require('https');

https.get('https://ebonnyaibdpplvjerjnk.supabase.co', (res) => {
  console.log('✅ Kết nối OK, status:', res.statusCode);
}).on('error', (e) => {
  console.error('❌ Lỗi:', e.message);
  console.error('Code:', e.code);
});