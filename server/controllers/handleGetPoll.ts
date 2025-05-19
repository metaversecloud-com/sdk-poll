import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset } from "../utils/index.js";

export const handleGetPoll = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const droppedAsset = await getDroppedAsset(credentials);

    await droppedAsset.fetchDataObject();

    return res.json({ poll: droppedAsset.dataObject, success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdatePoll",
      message: "Error updating poll settings",
      req,
      res,
    });
  }
};
