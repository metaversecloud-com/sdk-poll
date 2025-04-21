import { Request, Response } from "express";
import { errorHandler, getCredentials, getDroppedAsset, initializeDroppedAssetDataObject } from "../utils/index.js";

/*
  This function handles the GET request to retrieve the poll settings from a dropped asset.
  It fetches the poll data from the dropped asset's data object and returns it in the response.
*/
export const handleGetUpdatePoll = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { assetId, urlSlug } = credentials;

    const droppedAsset = await getDroppedAsset(credentials);
    // await initializeDroppedAssetDataObject(droppedAsset);

    // await droppedAsset.fetchDataObject();
    const pollData = droppedAsset.dataObject.poll || {}; 
    //print poll data
    // console.log("Poll data:", pollData);   
    console.log(droppedAsset.dataObject.poll);

    return res.json({ success: true, poll: pollData });

  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetUpdatePoll",
      message: "Error getting poll settings from dropped asset",
      req,
      res,
    });
  }
};
