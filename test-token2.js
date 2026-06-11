const axios = require('axios');

async function testGHL() {
  const token = 'pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f';
  const locationId = 'P62nq2IVqxaQbOrD3P1R';
  
  console.log("Testing V2 API Users...");
  try {
    const res2 = await axios.get(`https://services.leadconnectorhq.com/users/?locationId=${locationId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      }
    });
    console.log("V2 Users Success:", res2.data.users.length, "users found.");
  } catch (err) {
    console.error("V2 Error:", err.response?.status, err.response?.data);
  }
}

testGHL();
