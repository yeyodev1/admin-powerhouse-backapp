import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { HttpStatusCode } from "axios";
import {
  getPersons,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  addMedicalFile,
  removeMedicalFile,
} from "../services/person.service";
import { aiService } from "../services/ai.service";

export async function getAllPersons(req: AuthRequest, res: Response) {
  const search = req.query.search as string;
  const filter = req.query.filter as string;
  const userId = req.user?.userId;

  const persons = await getPersons({ search, filter, userId });
  res.json(persons);
}

export async function getOnePerson(req: AuthRequest, res: Response) {
  const person = await getPersonById(req.params.id as string);
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
  const person = await updatePerson(req.params.id as string, req.body);
  res.json(person);
}

export async function remove(req: AuthRequest, res: Response) {
  await deletePerson(req.params.id as string);
  res.json({ message: "Person deleted" });
}

export async function uploadFile(req: AuthRequest, res: Response) {
  const { url, filename, type } = req.body;
  if (!url || !filename) {
    throw new (await import("../errors/customError.error")).CustomError("url and filename required", 400);
  }
  const person = await addMedicalFile(req.params.id as string, { url, filename, type: type || "application/octet-stream" });
  res.json(person);
}

export async function deleteFile(req: AuthRequest, res: Response) {
  const person = await removeMedicalFile(req.params.id as string, req.params.fileId as string);
  res.json(person);
}

export async function analyzePerson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { patientContext, files } = req.body;
    if (!patientContext || !files) {
      throw new (await import("../errors/customError.error")).CustomError("patientContext and files are required", 400);
    }
    const result = await aiService.analyzeClinicalFiles(patientContext, files);
    res.status(HttpStatusCode.Ok).send({
      message: "Analysis completed successfully.",
      result,
    });
    return;
  } catch (error) {
    next(error);
  }
}

export async function generateReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { params, openAiResult } = req.body;
    if (!params || !openAiResult) {
      throw new (await import("../errors/customError.error")).CustomError("params and openAiResult are required", 400);
    }
    const result = await aiService.generateRegenerativeReport(params, openAiResult);
    res.status(HttpStatusCode.Ok).send({
      message: "Report generated successfully.",
      result,
    });
    return;
  } catch (error) {
    next(error);
  }
}

export async function saveAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { filesUsed, openAiResult, patientParams, claudeResult } = req.body;
    if (!filesUsed || !openAiResult || !patientParams || !claudeResult) {
      throw new (await import("../errors/customError.error")).CustomError("Missing required fields for saving analysis", 400);
    }
    
    const { addAiAnalysis } = await import("../services/person.service");
    const person = await addAiAnalysis(req.params.id as string, {
      filesUsed,
      openAiResult,
      patientParams,
      claudeResult
    });
    
    res.status(HttpStatusCode.Created).send({
      message: "Analysis history saved successfully.",
      person,
    });
    return;
  } catch (error) {
    next(error);
  }
}
