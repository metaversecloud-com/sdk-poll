import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset } from "../utils/index.js";

/* 
  This function handles the PUT request to set the poll of a dropped asset.
  It updates the poll data in the dropped asset's data object and returns a success response.
*/
export const handleUpdatePoll = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, profileId, urlSlug } = credentials;
    const { question, answer1, answer2, answer3, answer4, answer5, displayMode } = req.body;

    const droppedAsset = await getDroppedAsset(credentials);

    const lockId = `${assetId}-pollUpdate-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`;
    await droppedAsset.updateDataObject(
      {
        question: question,
        answers: [answer1, answer2, answer3, answer4, answer5],
        displayMode: displayMode,
        options: {
          "0": { votes: 0 },
          "1": { votes: 0 },
          "2": { votes: 0 },
          "3": { votes: 0 },
          "4": { votes: 0 },
        },
        results: {},
      },
      {
        lock: { lockId, releaseLock: true },
        analytics: [
          {
            analyticName: "updates",
            profileId,
            urlSlug,
            uniqueKey: profileId,
          },
        ],
      },
    );

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
