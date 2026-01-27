import mongoose from "mongoose";
import bcrypt from "bcrypt" 
import  jwt from "jsonwebtoken";

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
        Unique : true ,
      } ,
      password : {
        type : String ,
        required : true ,
      }, 
       refreshtoken : {
        type : String 
       }

} , {timestamps : true})
export const User = mongoose.model("User" , userschema)


userschema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    console.log("Password hashed");
    next(); 
  } catch (err) {
    next(err);
  }
});


userschema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};




