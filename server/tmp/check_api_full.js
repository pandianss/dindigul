const http = require('http');

http.get('http://localhost:5000/api/public/setup', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Keys:', Object.keys(json));
      if (json.branchList) {
        console.log('Branch 0:', JSON.stringify(json.branchList[0], null, 2));
      } else {
        console.log('JSON content sample:', data.substring(0, 500));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw data sample:', data.substring(0, 500));
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
