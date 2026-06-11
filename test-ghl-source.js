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
    const msgs = msgsRes.data.messages?.messages || [];
    msgs.forEach(m => {
      if (m.direction === 'outbound') {
        console.log(`Msg: ${m.body.substring(0, 30)}... | Source: ${m.source} | UserId: ${m.userId}`);
      }
    });
  } catch (err) {
    console.log("Error:", err.message);
  }
}
run();
