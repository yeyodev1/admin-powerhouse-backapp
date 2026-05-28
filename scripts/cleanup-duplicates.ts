import mongoose from 'mongoose';
import { Person } from '../src/models/person.model';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.DB_URI as string);
  console.log('Connected to DB');

  const persons = await Person.find({});
  const emails = new Map();

  let deletedCount = 0;

  for (const person of persons) {
    if (!person.email) continue;
    
    if (emails.has(person.email)) {
      const existing = emails.get(person.email);
      // Keep the one that has a createdBy, or is newer
      if (!existing.createdBy && person.createdBy) {
        // delete existing, keep current
        console.log(`Deleting duplicate (no creator): ${existing._id} for email ${person.email}`);
        await Person.deleteOne({ _id: existing._id });
        emails.set(person.email, person);
        deletedCount++;
      } else {
        // delete current
        console.log(`Deleting duplicate: ${person._id} for email ${person.email}`);
        await Person.deleteOne({ _id: person._id });
        deletedCount++;
      }
    } else {
      emails.set(person.email, person);
    }
  }

  console.log(`Deleted ${deletedCount} duplicate persons.`);
  await mongoose.disconnect();
}

run().catch(console.error);
