import { Person, IPerson } from "../models/person.model";
import { User } from "../models/user.model";
import { CustomError } from "../errors/customError.error";

export async function getPersons(query?: { search?: string; filter?: string; userId?: string }) {
  // Find internal users and admins to exclude them from the patients list
  const internalAndAdmins = await User.find({
    $or: [{ isInternal: true }, { role: "admin" }],
  }).select("email");

  const excludedEmails = internalAndAdmins.map((u) => u.email).filter(Boolean);

  const mongoQuery: any = { email: { $nin: excludedEmails } };

  if (query?.filter === "mine" && query?.userId) {
    mongoQuery.createdBy = query.userId;
  } else if (query?.filter === "with-files") {
    mongoQuery["medicalFiles.0"] = { $exists: true };
  }

  if (query?.search && query.search.trim()) {
    const s = query.search.trim();
    const regex = new RegExp(s, "i");
    mongoQuery.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  return Person.find(mongoQuery)
    .sort({ createdAt: -1 })
    .populate("createdBy", "_id name email isInternal role");
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
  
  if (data.email) {
    const existingPerson = await Person.findOne({ email: data.email });
    if (existingPerson) {
      throw new CustomError("Ya existe una persona registrada con este correo electrónico", 400);
    }
  }

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

export async function addAiAnalysis(
  personId: string,
  analysisData: { filesUsed: string[]; openAiResult: string; patientParams: any; claudeResult: string }
) {
  return Person.findByIdAndUpdate(
    personId,
    { $push: { aiAnalyses: { ...analysisData, date: new Date() } } },
    { new: true }
  );
}
