import { Atsscore } from "../models/Atsscore.model.js";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { Optimize } from "../models/Optimize.model.js";
import { ApiError } from "../utils/ApiError.js";
// Create or update (upsert) ATS score for current user. Use after atscheck; retry = update.
const createAtsscore = Asynchandler(async (req, res) => {
    const { score } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (score == null || typeof score !== "number") return res.status(400).json({ message: "score (number) is required" });
    const atsscore = await Atsscore.findOneAndUpdate(
        { userId },
        { score },
        { new: true, upsert: true }
    );
    return res.status(200).json(new ApiResponse(200, atsscore, "Atsscore saved successfully"));
});

// Get current user's ATS score (one doc per user).
const getAtsscore = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const atsscore = await Atsscore.findOne({ userId }).sort({ updatedAt: -1 });
    return res.status(200).json(new ApiResponse(200, atsscore, "Atsscore fetched successfully"));
});

const updateAtsscore = Asynchandler(async (req, res) => {
    const { id } = req.params;
    const { score } = req.body;
    const userId = req.user?._id;
    const atsscore = await Atsscore.findOne({ _id: id, userId });
    if (!atsscore) return res.status(404).json({ message: "Atsscore not found" });
    const updated = await Atsscore.findByIdAndUpdate(id, { score }, { new: true });
    return res.status(200).json(new ApiResponse(200, updated, "Atsscore updated successfully"));
});

const createOptimize = Asynchandler(async (req, res) => {
    const { number } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (number == null || typeof number !== "number") return res.status(400).json({ message: "number (number) is required" });
    const optimize = await Optimize.findOneAndUpdate(
        { userId },
        { number },
        { new: true, upsert: true } 
    );
    return res.status(200).json(new ApiResponse(200, optimize, "Optimize saved successfully"));
});

const getOptimize = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const optimize = await Optimize.findOne({ userId }).sort({ updatedAt: -1 });
    return res.status(200).json(new ApiResponse(200, optimize, "Optimize fetched successfully"));
});

const updateOptimize = Asynchandler(async (req, res) => {
    const { id } = req.params;
    const { number } = req.body;
    const userId = req.user?._id;
    const optimize = await Optimize.findOne({ _id: id, userId });
    if (!optimize) return res.status(404).json({ message: "Optimize not found" });
    const updated = await Optimize.findByIdAndUpdate(id, { number }, { new: true });
    return res.status(200).json(new ApiResponse(200, updated, "Optimize updated successfully"));
});

export { createAtsscore, getAtsscore, updateAtsscore, createOptimize, getOptimize, updateOptimize };