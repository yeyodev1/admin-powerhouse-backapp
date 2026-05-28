import dotenv from "dotenv";
import { dbConnect } from "./config/mongo";
import { hashPassword } from "./services/auth.service";
import { User } from "./models/user.model";

async function seed() {
  dotenv.config();
  await dbConnect();

  const email = "admin@powerhousebiotech.com";
  const password = "123456789";
  const name = "Administrator";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin user already exists");
    process.exit(0);
  }

  const hashed = await hashPassword(password);
  const admin = await User.create({
    name,
    email,
    password: hashed,
    role: "admin",
  });

  console.log(`Admin user created: ${email} / ${password}`);
  process.exit(0);
}

seed();