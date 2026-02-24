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
      password : {
        type : String ,
        required : [true, "Password is required"],
        minlength : [8, "Password must be at least 8 characters"],
        validate : {
          validator : function (v) {
            return /^(?=.*[a-zA-Z])(?=.*\d).+$/.test(v);
          },
          message : "Password must contain at least one letter and one number",
        },
      }, 
      Premium : {
        type : Boolean ,
        default : false ,
      },
      isAdmin : {
        type : Boolean ,
        default : false ,
      },
       refreshtoken : {
        type : String 
       },
      forgotPasswordOtp : { type : String },
      forgotPasswordOtpExpiresAt : { type : Date }

} , { timestamps : true, validateBeforeSave: true })

// Promise-based hook (avoids "next is not a function" issues)
userschema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userschema.methods.isPasswordCorrect = async function(password) {
  if (!password || !this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Prevent OverwriteModelError during reload / mixed import paths
export const User = mongoose.models.User || mongoose.model("User" , userschema)




