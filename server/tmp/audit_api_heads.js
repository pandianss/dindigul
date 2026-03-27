const http = require('http');

http.get('http://localhost:5000/api/public/setup', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
      const json = JSON.parse(data);
      const branchList = json.setup.branchList;
      const results = branchList.map(b => ({
        code: b.code,
        name: b.nameEn,
        head: b.headName
      }));
      console.table(results);
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
