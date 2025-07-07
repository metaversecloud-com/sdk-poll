import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset } from "../utils/index.js";

export const handleVote = async (req: Request, res: Response) => {
  try {
    // Extract credentials and vote details
    const credentials = getCredentials(req.query);
    const { assetId } = credentials;
    const { optionId, profileId } = req.body;
    if (optionId === undefined || !profileId) {
      return res.status(400).json({ success: false, message: "optionId and profileId are required" });
    }

    // Get the dropped asset and ensure its data object exists
    const droppedAsset = await getDroppedAsset(credentials);

    // Fetch the current data object
    const currentPoll = droppedAsset.dataObject || {};
    const previousVote = currentPoll.results?.[profileId]?.answer;

    // New copies of the current options/results data
    let newOptions = { ...currentPoll.options };
    let newResults = { ...currentPoll.results };

    // If the user already voted, remove the previous vote by decrementing that option
    if (previousVote !== undefined) {
      if (newOptions[previousVote] && typeof newOptions[previousVote].votes === "number") {
        newOptions[previousVote] = { votes: Math.max(newOptions[previousVote].votes - 1, 0) };
      }
    }

    newOptions[optionId] = { votes: (newOptions[optionId]?.votes || 0) + 1 };

    newResults[profileId] = { answer: optionId };

    const lockId = `${assetId}-voteUpdate-${new Date(Math.round(new Date().getTime() / 10000) * 10000)}`;

    // Update the entire poll object in one go

    await droppedAsset.updateDataObject(
      {
        options: newOptions,
        results: newResults,
      },
      {
        lock: { lockId, releaseLock: true },
        analytics: [
          {
            analyticName: "completions",
            uniqueKey: profileId,
          },
        ],
      },
    );

    await droppedAsset.fetchDataObject();

    return res.json({ success: true, poll: droppedAsset.dataObject });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleVote",
      message: "Error recording vote",
      req,
      res,
    });
  }
};
