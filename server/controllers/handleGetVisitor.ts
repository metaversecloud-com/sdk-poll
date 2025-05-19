import { errorHandler, getVisitor, getCredentials } from "../utils/index.js";
import { Request, Response } from "express";

export const handleGetVisitor = async (req: Request, res: Response): Promise<Record<string, any> | void> => {
  try {
    const credentials = getCredentials(req.query);

    const visitor = await getVisitor(credentials);
    const { isAdmin, profileId } = visitor;

    return res.json({ visitor: { isAdmin, profileId }, success: true });
  } catch (error) {
    return errorHandler({ error, functionName: "handleGetVisitor", message: "Error getting visitor", req, res });
  }
};
