import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset } from "../utils/index.js";
import { defaultPoll } from "../constants.js";

/* 
  This function handles the POST request to reset the scene by reinitializing the dropped asset data object.
*/
export const handleResetScene = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    const droppedAsset = await getDroppedAsset(credentials);

    await droppedAsset.updateDataObject(defaultPoll);
    return res.json({ success: true });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleResetScene",
      message: "Error resetting asset",
      req,
      res,
    });
  }
};
