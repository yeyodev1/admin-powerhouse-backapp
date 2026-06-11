const axios = require('axios');
async function run() {
  const token = "pit-c68a57c4-a622-4c04-b968-52c35f4dfe1f";
  try {
    const msgsRes = await axios.get(`https://services.leadconnectorhq.com/conversations/9VNzYEgZgd7oIogZ77ND/messages`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Version": "2021-07-28"
      }
    });
    console.log(Object.keys(msgsRes.data));
    console.log(msgsRes.data.messages);
    console.log(msgsRes.data.messages?.messages);
    console.log(msgsRes.data.messages?.messages?.length);
  } catch (err) {
    console.log("Error:", err.message, err.response?.data);
  }
}
run();
