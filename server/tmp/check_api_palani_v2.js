const http = require('http');

http.get('http://localhost:5000/api/public/setup', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const json = JSON.parse(data);
      const palani = json.branchList.find(b => b.code === '0376');
      console.log('Palani:', JSON.stringify(palani, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
