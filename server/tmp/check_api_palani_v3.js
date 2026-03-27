const http = require('http');

http.get('http://localhost:5000/api/public/setup', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const json = JSON.parse(data);
      const branchList = json.setup.branchList;
      const palani = branchList.find(b => b.code === '0376');
      console.log('Palani:', JSON.stringify(palani, null, 2));
      
      const missingHead = branchList.filter(b => !b.headName);
      console.log('Branches missing headName:', missingHead.length, 'out of', branchList.length);
      if (missingHead.length > 0) {
        console.log('Sample missing:', JSON.stringify(missingHead[0], null, 2));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
