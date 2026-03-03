import mongoose from "mongoose";


const deploymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  portfolioUrl: String,
  vercelDeploymentId: { type: String, default: null },
  deployedAt: Date
});

export const Deployment = mongoose.model("Deployment", deploymentSchema);