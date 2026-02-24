import mongoose from "mongoose";

const atsscoreSchema = new mongoose.Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    score : {
        type : Number,
        required : true,
    },
}, { timestamps : true });

export const Atsscore = mongoose.model("Atsscore", atsscoreSchema);