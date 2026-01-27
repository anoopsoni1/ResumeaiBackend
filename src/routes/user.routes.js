import { Router } from "express";
import { getCurrentUser, loginuser, logoutUser, registeruser } from "../controller/user.controller.js";
import parseFormData from "../middleware/parse.middlerware.js";
import {CheckATSScore} from "../controller/atschecker.controller.js"
import {upload} from "../middleware/multer.middleware.js"
import { aiEditResume, exportResume, UploadResume } from "../controller/Uploadresume.controller.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route("/register").post(parseFormData , registeruser)
router.route("/login").post(parseFormData , loginuser)
router.route("/logout").post(logoutUser)
router.route("/profile").get(getCurrentUser) 
router.route("/atscheck").post(CheckATSScore)
router.route("/upload").post( upload.single("resume"), UploadResume);
router.route("/aiedit").post(aiEditResume)
router.route("/docx").post(exportResume)


export {router}