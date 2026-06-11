import 'dotenv/config'
import { dbConnect } from "./config/mongo";
import { createApp } from "./app";

const port = process.env.PORT || 8100;

const { app, server } = createApp();

dbConnect().catch(console.error);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const port = process.env.PORT || 8100;
  server.timeout = 10 * 60 * 1000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
