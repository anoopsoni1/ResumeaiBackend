import {Asynchandler} from "../utils/Asynchandler.js"
import {ApiResponse}  from "../utils/Apiresponse.js"
import {ApiError} from '../utils/ApiError.js'
 import { User } from "../models/User.model.js"
import  jwt from "jsonwebtoken";
import bcrypt from "bcrypt" 


   const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const accessToken = jwt.sign(
          {user : user._id ,
            FirstName : user.FirstName,
            LastName : user.LastName ,
            email : user.email
          } ,
          process.env.ACCESS_TOKEN ,
          {
           expiresIn: process.env.ACCESS_TOKEN_EXPIRY
          }
        )
        
        const refreshToken = jwt.sign(
          {user : user._id} ,
          process.env.REFRESH_TOKEN ,
          {
           expiresIn: process.env.REFRESH_TOKEN_EXPIRY
          }
        )
 
        user.refreshtoken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (e) {
     console.error("Token generation error:", e.message);
    throw new ApiError(400 ,"Failed to generate tokens");
    }
};

const registeruser = Asynchandler(async(req ,res)=>{
   
  const {FirstName, LastName , email , password } = req.body 

      
  if(!FirstName?.trim()) throw new ApiError(400 , "Firstname is required")
 if(!LastName?.trim()) throw new ApiError(400 , "Lastname is required")
  if(!email?.trim()) throw new ApiError(400 ,  "Email is required")
  if(!password?.trim()) throw new ApiError(400 , "Password is required")

    const existeduser = await User.findOne({email : email})

    if(existeduser) throw new ApiError(400 , "user existed")

      const user = await User.create({
        FirstName ,
        LastName ,
        email ,
        password
      })

      const createduser =  await User.findById(user._id)

const newuser = await User.findById(createduser._id).select("-password -refreshtoken"); 

      if(!createduser) throw new ApiError(400 , "something went wrong") 

        return res.status(200).json(
            new ApiResponse(200 , newuser , "User registerd succesfully")
        )

})

const loginuser = Asynchandler(async(req ,res)=>{
   
       const {email , password} = req.body
 
      if(!email) throw new ApiError(400 , "Email is required")
      if(!password) throw new ApiError(400 , "Password is required")

      const user = await User.findOne({ email })

      if(!user) throw new ApiError(400 , "User does not exist")


             

   const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")
   const options = {
        httpOnly: true,
        // Don't block cookies on http://localhost during dev
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    }
       return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})
const logoutUser = Asynchandler(async(req, res) => {
   
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out" });
});

  const getCurrentUser = (req, res) => {
  const user = req.user; 
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  res.json({ user });
};

const updateAccountDetails = Asynchandler(async (req, res) => {
    console.log("req.body ", req.body) || {}
    const { email, FirstName } = req.body
    if (!FirstName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { FirstName, email } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});


export {
    registeruser,
     loginuser,
     logoutUser,
     getCurrentUser,
    updateAccountDetails
}