import mongoose from "mongoose";

const optimizeSchema = new mongoose.Schema({
   userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
   number : {
    type : Number,
    required : true,
   }
}, { timestamps : true });
export const Optimize = mongoose.model("Optimize", optimizeSchema);