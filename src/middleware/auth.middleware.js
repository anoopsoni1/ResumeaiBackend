import { ApiError } from "../utils/ApiError.js";
import { Asynchandler } from "../utils/Asynchandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/User.model.js";

export const verifyJWT = Asynchandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
             
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        // Your `.env` uses ACCESS_TOKEN (not ACCESS_TOKEN_SECRET)
        const secret = process.env.ACCESS_TOKEN || process.env.ACCESS_TOKEN_SECRET
        const decodedToken = jwt.verify(token, secret)
    
        // token payload uses `user` in `loginuser`
        const userId = decodedToken?._id || decodedToken?.user
        const user = await User.findById(userId).select("-password -refreshtoken")
            
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next() ;
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})