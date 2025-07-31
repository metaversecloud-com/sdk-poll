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

    const { crucial, displayMode } = req.body as {
      crucial: boolean;
      displayMode: "percentage" | "count";
      question?: string;
      answers?: string[];
    };

    const droppedAsset = await getDroppedAsset(credentials);

    // fetch the existing dataObject so we can spread it below
    await droppedAsset.fetchDataObject();
    const existing = droppedAsset.dataObject as any;

    let updatePayload: Record<string, any>;

    if (crucial) {
      // get q and a from payload
      const { question, answers } = req.body as {
        question: string;
        answers: string[];
      };

      // validate
      const validAnswers = (answers || []).filter((a) => a.trim() !== "");
      if (!question?.trim() || validAnswers.length < 2) {
        return res.status(400).json({ success: false, message: "Question required and at least two answers." });
      }

      // build options where each looks like: "0": { votes: 0 }, etc..
      const options: Record<string, { votes: number }> = {};
      validAnswers.forEach((_, idx) => {
        options[idx] = { votes: 0 };
      });

      updatePayload = {
        question: question.trim(),
        answers: validAnswers,
        displayMode,
        options,
        results: {}, // reset results!!!!!
      };
    } else {
      // non-crucial so only update display mode
      updatePayload = {
        ...existing,
        displayMode,
      };
    }

    const lockId = `${assetId}-pollUpdate-${Date.now()}`;
    await droppedAsset.updateDataObject(updatePayload, {
      lock: { lockId, releaseLock: true },
      analytics: [
        {
          analyticName: "pollUpdate",
          profileId,
          urlSlug,
          uniqueKey: profileId,
        },
      ],
    });

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
