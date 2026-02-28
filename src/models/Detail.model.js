import mongoose from "mongoose";

const detailSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        default: "",
    },
    skills: {
        type: [String],
        default: [],
    },
    experience: {
        type: [String],
        default: [],
    },
    projects: {
        type: [String],
        default: [],
    },
    education: {
        type: String,
        default: "",
    },
    languageProficiency: {
        type: String,
        default: "",
    },
    email: {
        type: String,
        default: "",
    },
    phone: {
        type: String,
        default: "",
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

export const Detail = mongoose.model("Detail", detailSchema);