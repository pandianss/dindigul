const http = require('http');

http.get('http://localhost:5000/api/public/setup', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const json = JSON.parse(data);
      const branchList = json.setup.branchList;
      const palanis = branchList.filter(b => b.code === '0376');
      console.log('Palanis found:', palanis.length);
      console.log(JSON.stringify(palanis, null, 2));
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
