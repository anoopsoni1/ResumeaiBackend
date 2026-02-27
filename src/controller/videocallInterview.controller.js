import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
import { VideocallInterview } from "../models/VideocallInterview.model.js";
import { User } from "../models/User.model.js";

// Create interview (recruiter schedules; candidateId or candidateEmail)
const createInterview = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { candidateId, candidateEmail, role, roomId, scheduledAt } = req.body;
  if (!role?.trim()) throw new ApiError(400, "Role is required");
  let candidate = null;
  if (candidateId) {
    candidate = await User.findById(candidateId).select("_id email");
    if (!candidate) throw new ApiError(404, "Candidate not found");
  } else if (candidateEmail?.trim()) {
    candidate = await User.findOne({ email: candidateEmail.trim() }).select("_id email");
    if (!candidate) throw new ApiError(404, "Candidate not found with this email");
  } else {
    throw new ApiError(400, "Provide candidateId or candidateEmail");
  }
  const interview = await VideocallInterview.create({
    recruiterId: userId,
    candidateId: candidate._id,
    role: role.trim(),
    roomId: roomId?.trim() || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    status: "scheduled",
  });
  const populated = await VideocallInterview.findById(interview._id)
    .populate("recruiterId", "FirstName LastName email")
    .populate("candidateId", "FirstName LastName email")
    .lean();
  return res.status(201).json(new ApiResponse(201, populated, "Interview created"));
});

// Get interviews where current user is recruiter or candidate
const getMyInterviews = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const list = await VideocallInterview.find({
    $or: [{ recruiterId: userId }, { candidateId: userId }],
  })
    .populate("recruiterId", "FirstName LastName email")
    .populate("candidateId", "FirstName LastName email")
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json(new ApiResponse(200, list, "Interviews fetched"));
});

// Get single interview by id (only if user is recruiter or candidate)
const getInterviewById = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params;
  const interview = await VideocallInterview.findOne({
    _id: id,
    $or: [{ recruiterId: userId }, { candidateId: userId }],
  })
    .populate("recruiterId", "FirstName LastName email")
    .populate("candidateId", "FirstName LastName email")
    .lean();
  if (!interview) throw new ApiError(404, "Interview not found");
  return res.status(200).json(new ApiResponse(200, interview, "Interview fetched"));
});

// Update interview (e.g. startedAt, endedAt, roomId) - only recruiter or candidate
const updateInterview = Asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params;
  const allowed = ["startedAt", "endedAt", "roomId", "status"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      if (key === "startedAt" || key === "endedAt") updates[key] = new Date(req.body[key]);
      else updates[key] = req.body[key];
    }
  }
  const interview = await VideocallInterview.findOne({
    _id: id,
    $or: [{ recruiterId: userId }, { candidateId: userId }],
  });
  if (!interview) throw new ApiError(404, "Interview not found");
  Object.assign(interview, updates);
  await interview.save();
  const populated = await VideocallInterview.findById(interview._id)
    .populate("recruiterId", "FirstName LastName email")
    .populate("candidateId", "FirstName LastName email")
    .lean();
  return res.status(200).json(new ApiResponse(200, populated, "Interview updated"));
});

export { createInterview, getMyInterviews, getInterviewById, updateInterview };
