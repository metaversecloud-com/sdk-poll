import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset, initializeDroppedAssetDataObject } from "../utils/index.js";


export const handleUpdatePoll = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;
    const sceneDropId = credentials.sceneDropId || credentials.assetId;
    const { question, answer1, answer2, answer3, answer4, answer5, displayMode } = req.body;

    const droppedAsset = await getDroppedAsset(credentials);
    // await initializeDroppedAssetDataObject(droppedAsset);
    // const dataObject = await droppedAsset.fetchDataObject();

    const lockId = `${assetId}-pollUpdate-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`;
    await droppedAsset.updateDataObject(
      {
        "poll.question": question,
        "poll.answers": [answer1, answer2, answer3, answer4, answer5],
        "poll.displayMode": displayMode,
        "lastInteractionDate": new Date(),
        "poll.options": {
          '0': { votes: 0 },
          '1': { votes: 0 },
          '2': { votes: 0 },
          '3': { votes: 0 },
          '4': { votes: 0 },
        },
        "poll.results": {},
      },
      { lock: { lockId, releaseLock: true } },
    );

    // await droppedAsset.fetchDataObject();
    console.log("Poll updated:", droppedAsset.dataObject.poll);
    
    return res.json({ success: true });

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
