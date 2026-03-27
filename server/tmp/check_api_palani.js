const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function check() {
  const resp = await fetch('http://localhost:5000/api/public/setup');
  const data = await resp.json();
  
  const palani = data.branchList.find(b => b.code === '0376');
  console.log('Palani:', JSON.stringify(palani, null, 2));
}

check().catch(console.error);
