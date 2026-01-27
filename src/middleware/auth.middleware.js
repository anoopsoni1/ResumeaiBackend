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
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log(decodedToken)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
            
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
         console.log(user)
        next() ;
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})