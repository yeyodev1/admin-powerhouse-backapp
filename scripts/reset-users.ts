import dotenv from "dotenv";
import { dbConnect } from "../src/config/mongo";
import { hashPassword } from "../src/services/auth.service";
import { User } from "../src/models/user.model";

async function resetUsers() {
  dotenv.config();
  await dbConnect();

  console.log("Deleting all existing users...");
  const deleteResult = await User.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} users.`);

  const email = "admin@powerhousebiotech.com";
  const password = "123456789";
  const name = "Administrator";

  const hashed = await hashPassword(password);
  await User.create({
    name,
    email,
    password: hashed,
    role: "admin",
  });

  console.log(`Default admin re-created: ${email} / ${password}`);
  process.exit(0);
}

resetUsers().catch((err) => {
  console.error("Error resetting users:", err);
  process.exit(1);
});
