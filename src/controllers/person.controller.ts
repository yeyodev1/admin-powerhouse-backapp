import { Response } from "express";
import { AuthRequest } from "../types/AuthRequest";
import {
  getPersons,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  addMedicalFile,
  removeMedicalFile,
} from "../services/person.service";

export async function getAllPersons(req: AuthRequest, res: Response) {
  const persons = await getPersons();
  res.json(persons);
}

export async function getOnePerson(req: AuthRequest, res: Response) {
  const person = await getPersonById(req.params.id);
  res.json(person);
}

export async function create(req: AuthRequest, res: Response) {
  const person = await createPerson({
    ...req.body,
    createdBy: req.user!.userId,
  });
  res.status(201).json(person);
}

export async function update(req: AuthRequest, res: Response) {
  const person = await updatePerson(req.params.id, req.body);
  res.json(person);
}

export async function remove(req: AuthRequest, res: Response) {
  await deletePerson(req.params.id);
  res.json({ message: "Person deleted" });
}

export async function uploadFile(req: AuthRequest, res: Response) {
  const { url, filename, type } = req.body;
  if (!url || !filename) {
    throw new (await import("../errors/customError.error")).CustomError("url and filename required", 400);
  }
  const person = await addMedicalFile(req.params.id, { url, filename, type: type || "application/octet-stream" });
  res.json(person);
}

export async function deleteFile(req: AuthRequest, res: Response) {
  const person = await removeMedicalFile(req.params.id, req.params.fileId);
  res.json(person);
}
