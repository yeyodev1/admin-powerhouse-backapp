const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://services.leadconnectorhq.com/locations/search', {
      headers: {
        'Authorization': 'Bearer pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f',
        'Version': '2021-07-28'
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error('Locations Error:', err.response?.data || err.message);
  }
  
  try {
    const res = await axios.get('https://services.leadconnectorhq.com/users', {
      headers: {
        'Authorization': 'Bearer pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f',
        'Version': '2021-07-28'
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error('Users Error:', err.response?.data || err.message);
  }
}

test();
