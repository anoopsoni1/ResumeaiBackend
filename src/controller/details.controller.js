import { Detail } from "../models/Detail.model.js";    
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
 
 
const createDetail = Asynchandler(async (req, res) => {
    const { name, role, summary, skills, experience, projects, education, languageProficiency, email, phone } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const payload = {
        name: (name != null && String(name).trim()) ? String(name).trim() : "Your Name",
        role: (role != null && String(role).trim()) ? String(role).trim() : "Your Role",
        summary: summary != null ? String(summary).trim() : "",
        skills: Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean) : [],
        experience: Array.isArray(experience) ? experience.map((e) => (e != null ? String(e).trim() : "")) : [],
        projects: Array.isArray(projects) ? projects.map((p) => (p != null ? String(p).trim() : "")) : [],
        education: education != null ? String(education).trim() : "",
        languageProficiency: languageProficiency != null ? String(languageProficiency).trim() : "",
        email: email != null ? String(email).trim() : "",
        phone: phone != null ? String(phone).trim() : "",
    };
    const detail = await Detail.findOneAndUpdate(
        { userId },
        { ...payload, userId },
        { new: true, upsert: true, runValidators: true }
    );
    return res.status(200).json(new ApiResponse(200, detail, "Detail saved successfully"));
});

const getDetail = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const detail = await Detail.findOne({ userId });
    if (!detail) return res.status(404).json({ message: "Detail not found" });
    return res.status(200).json(new ApiResponse(200, detail, "Detail fetched successfully"));
});

const updateDetail = Asynchandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, summary, skills, experience, projects, education, languageProficiency, email, phone } = req.body;
    const userId = req.user?._id;
    const detail = await Detail.findOne({ _id: id, userId });
    if (!detail) return res.status(404).json({ message: "Detail not found" });
    const payload = {
        name: (name != null && String(name).trim()) ? String(name).trim() : "Your Name",
        role: (role != null && String(role).trim()) ? String(role).trim() : "Your Role",
        summary: summary != null ? String(summary).trim() : "",
        skills: Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean) : [],
        experience: Array.isArray(experience) ? experience.map((e) => (e != null ? String(e).trim() : "")) : [],
        projects: Array.isArray(projects) ? projects.map((p) => (p != null ? String(p).trim() : "")) : [],
        education: education != null ? String(education).trim() : "",
        languageProficiency: languageProficiency != null ? String(languageProficiency).trim() : "",
        email: email != null ? String(email).trim() : "",
        phone: phone != null ? String(phone).trim() : "",
    };
    const updatedDetail = await Detail.findByIdAndUpdate(
        id,
        payload,
        { new: true, runValidators: true }
    );
    return res.status(200).json(new ApiResponse(200, updatedDetail, "Detail updated successfully"));
});

const deleteDetail = Asynchandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?._id;
    const detail = await Detail.findOne({ _id: id, userId });
    if (!detail) return res.status(404).json({ message: "Detail not found" });
    await Detail.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, null, "Detail deleted successfully"));
});

    export { createDetail, getDetail, updateDetail, deleteDetail };