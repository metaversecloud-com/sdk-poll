import express from "express";
import {
  handleGetVisitor,
  handleUpdatePoll,
  handleGetPoll,
  handleVote,
  handleResetScene,
} from "./controllers/index.js";
import { getVersion } from "./utils/getVersion.js";

const router = express.Router();
const SERVER_START_DATE = new Date();

router.get("/", (req, res) => {
  res.json({ message: "Hello from server!" });
});

router.get("/system/health", (req, res) => {
  return res.json({
    appVersion: getVersion(),
    status: "OK",
    serverStartDate: SERVER_START_DATE,
    envs: {
      NODE_ENV: process.env.NODE_ENV,
      INSTANCE_DOMAIN: process.env.INSTANCE_DOMAIN,
      INTERACTIVE_KEY: process.env.INTERACTIVE_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
    },
  });
});

// New Route for getting the data for existing poll
router.get("/poll", handleGetPoll);

// New Route for creating data object for newly dropped poll
router.put("/poll", handleUpdatePoll);

// New route for updating the poll w/ new vote
router.post("/vote", handleVote);

// New route for resetting the poll / entire droppedAssets data object
router.post("/admin/reset", handleResetScene);

// Visitor
router.get("/visitor", handleGetVisitor);

export default router;
