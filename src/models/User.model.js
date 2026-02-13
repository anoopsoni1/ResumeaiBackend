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
        required : true ,
      }, 
      Premium : {
        type : Boolean ,
        default : false ,
      },
       refreshtoken : {
        type : String 
       }

} , {timestamps : true})

// Promise-based hook (avoids "next is not a function" issues)
userschema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userschema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Prevent OverwriteModelError during reload / mixed import paths
export const User = mongoose.models.User || mongoose.model("User" , userschema)




