import { Deployment } from "../models/Deployment.model.js";
import { Asynchandler } from "../utils/Asynchandler.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { ApiError } from "../utils/ApiError.js";
import { deployToVercel, deleteFromVercel, generatePortfolioHTML } from "../services/vercelDeploy.service.js";

/**
 * POST /deploy-portfolio
 * Body: { htmlContent?: string, portfolioData?: object }
 * - If htmlContent is provided, it is deployed as-is.
 * - Otherwise portfolioData is used to generate static HTML, then deployed.
 * User is taken from req.user (verifyJWT). Returns { success, data: { url }, message }.
 */
const MAX_DEPLOYMENTS_PER_USER = 10;

export const deployPortfolio = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    const count = await Deployment.countDocuments({ userId });
    if (count >= MAX_DEPLOYMENTS_PER_USER) {
        throw new ApiError(400, "You cannot create more portfolios");
    }
    const { htmlContent, portfolioData } = req.body;

    let html = htmlContent;
    if (!html && portfolioData) {
        html = generatePortfolioHTML(portfolioData);
    }
    if (!html || typeof html !== "string") {
        throw new ApiError(400, "Provide htmlContent or portfolioData in the request body");
    }

    const username = (req.user?.username || req.user?.email || userId?.toString() || "user")
        .toString()
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 50);
    const projectName = `portfolio-${username}-${Date.now()}`;

    const { url: deploymentUrl, id: vercelDeploymentId } = await deployToVercel(projectName, html);
    const finalUrl = deploymentUrl.startsWith("http") ? deploymentUrl : `https://${deploymentUrl}`;

    await Deployment.create({
        userId,
        portfolioUrl: finalUrl,
        vercelDeploymentId: vercelDeploymentId || undefined,
        deployedAt: new Date(),
    });

    return res.status(200).json(
        new ApiResponse(200, { url: finalUrl, deployments: await Deployment.find({ userId }).sort({ deployedAt: -1 }).lean() }, "Portfolio deployed successfully")
    );
});

/**
 * GET /get-deployments
 * Returns the current user's deployments (latest first) for dashboard display.
 */
export const getDeployments = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    const deployments = await Deployment.find({ userId })
        .sort({ deployedAt: -1 })
        .lean();
    return res.status(200).json(
        new ApiResponse(200, deployments, "Deployments fetched")
    );
});

/**
 * DELETE /delete-deployment/:id
 * Deletes a deployment: removes from Vercel (if vercelDeploymentId exists) then from DB.
 * Only the owner can delete.
 */
export const deleteDeployment = Asynchandler(async (req, res) => {
    const userId = req.user?._id;
    const deploymentId = req.params?.id;
    if (!deploymentId) {
        throw new ApiError(400, "Deployment id is required");
    }
    const deployment = await Deployment.findOne({ _id: deploymentId, userId });
    if (!deployment) {
        throw new ApiError(404, "Deployment not found or you do not have access");
    }
    if (deployment.vercelDeploymentId) {
        try {
            await deleteFromVercel(deployment.vercelDeploymentId);
        } catch (err) {
            console.error("Vercel delete failed for", deployment.vercelDeploymentId, err.message);
        }
    }
    await Deployment.deleteOne({ _id: deploymentId, userId });
    return res.status(200).json(
        new ApiResponse(200, { deleted: true }, "Deployment deleted")
    );
});

