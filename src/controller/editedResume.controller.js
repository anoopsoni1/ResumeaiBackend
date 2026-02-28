import { EditedResume } from "../models/EditedResume.model.js";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";

export const getEditedResume = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const doc = await EditedResume.findOne({ userId });
  if (!doc) return res.status(200).json(new ApiResponse(200, { text: "" }, "No saved edited resume"));
  return res.status(200).json(new ApiResponse(200, { text: doc.text || "" }, "Edited resume fetched"));
});

export const saveEditedResume = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { text } = req.body;
  const doc = await EditedResume.findOneAndUpdate(
    { userId },
    { text: typeof text === "string" ? text : "" },
    { new: true, upsert: true }
  );
  return res.status(200).json(new ApiResponse(200, { text: doc.text }, "Edited resume saved"));
});
