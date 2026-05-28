import { Person, IPerson } from "../models/person.model";
import { CustomError } from "../errors/customError.error";

export async function getPersons() {
  return Person.find().sort({ createdAt: -1 }).populate('createdBy', '_id name email');
}

export async function getPersonById(id: string) {
  const person = await Person.findById(id);
  if (!person) throw new CustomError("Person not found", 404);
  return person;
}

export async function createPerson(data: {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  createdBy: string;
}) {
  if (!data.name) throw new CustomError("Name is required", 400);
  return Person.create(data);
}

export async function updatePerson(id: string, data: Partial<IPerson>) {
  const person = await Person.findByIdAndUpdate(id, data, { new: true });
  if (!person) throw new CustomError("Person not found", 404);
  return person;
}

export async function deletePerson(id: string) {
  const person = await Person.findByIdAndDelete(id);
  if (!person) throw new CustomError("Person not found", 404);
  return person;
}

export async function addMedicalFile(
  personId: string,
  file: { url: string; filename: string; type: string }
) {
  return Person.findByIdAndUpdate(
    personId,
    { $push: { medicalFiles: { ...file, uploadedAt: new Date() } } },
    { new: true }
  );
}

export async function removeMedicalFile(personId: string, fileId: string) {
  return Person.findByIdAndUpdate(
    personId,
    { $pull: { medicalFiles: { _id: fileId } } },
    { new: true }
  );
}
