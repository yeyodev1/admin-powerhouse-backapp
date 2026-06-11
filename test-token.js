const axios = require('axios');

async function testGHL() {
  const token = 'pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f';
  
  console.log("Testing V1 API...");
  try {
    const res1 = await axios.get('https://rest.gohighlevel.com/v1/users/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("V1 Users:", res1.data);
  } catch (err) {
    console.error("V1 Error:", err.response?.status, err.response?.data);
  }

  console.log("\nTesting V2 API (without locationId)...");
  try {
    const res2 = await axios.get('https://services.leadconnectorhq.com/users', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28'
      }
    });
    console.log("V2 Users:", res2.data);
  } catch (err) {
    console.error("V2 Error:", err.response?.status, err.response?.data);
  }
}

testGHL();
