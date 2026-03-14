import mongoose from "mongoose";
import bcrypt from "bcrypt" 

const userschema = new mongoose.Schema({
      FirstName  : {
         type : String ,
         required  : true ,
      },
      LastName : {
        type : String ,
       required : true
      }, 
      email : {
        type : String ,
        required : true ,
        unique : true ,
      } ,
      googleId : {
        type : String ,
        sparse : true ,
        unique : true ,
      } ,
      password : {
        type : String ,
        required : false ,
        minlength : [8, "Password must be at least 8 characters"],
      }, 
      Premium : {
        type : Boolean ,
        default : false ,
      },
      isAdmin : {
        type : Boolean ,
        default : false ,
      },
      plan : {
        type : String ,
        enum : [ "free", "premium" ],
        default : "free",
      },
   
      resumesDownloadedToday : {
        type : Number ,
        default : 0 ,
      },
      lastResumeDownloadDate : {
        type : Date ,
        default : null ,
      },
      // Premium: 5 live interviews per day
      liveInterviewsToday : { type : Number , default : 0 },
      lastLiveInterviewDate : { type : Date , default : null },
      // Premium: 5 coding interviews per day
      codingInterviewsToday : { type : Number , default : 0 },
      lastCodingInterviewDate : { type : Date , default : null },
      // Premium: 15 roadmap suggestions per day
      roadmapSuggestionsToday : { type : Number , default : 0 },
      lastRoadmapSuggestionDate : { type : Date , default : null },
       refreshtoken : {
        type : String 
       },
      forgotPasswordOtp : { type : String },
      forgotPasswordOtpExpiresAt : { type : Date }

} , { timestamps : true, validateBeforeSave: true })

// Promise-based hook (avoids "next is not a function" issues)
userschema.pre("save", async function () {
  if (!this.isModified("password") || !this.password || this.password.length === 0) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userschema.methods.isPasswordCorrect = async function(password) {
  if (!password || !this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Prevent OverwriteModelError during reload / mixed import paths
export const User = mongoose.models.User || mongoose.model("User" , userschema)




