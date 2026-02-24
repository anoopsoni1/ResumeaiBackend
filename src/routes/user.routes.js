import { Router } from "express";
import { getCurrentUser, loginuser, logoutUser, registeruser } from "../controller/user.controller.js";
import parseFormData from "../middleware/parse.middlerware.js";
import {CheckATSScore} from "../controller/atschecker.controller.js"
import {upload} from "../middleware/multer.middleware.js"
import { aiEditResume, exportResume, UploadResume } from "../controller/Uploadresume.controller.js";
import { Payment, VerifyPayment } from "../controller/payment.controller.js";
 import { verifyJWT, requireAdmin } from "../middleware/auth.middleware.js";
 import Mail from "../controller/email.controller.js";
 import { makePremium, makeAdmin, resetPassword, forgotPassword, getallusers } from "../controller/user.controller.js";
 import {
    createTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
  } from "../controller/template.controller.js";

const router = Router()

router.route("/register").post(parseFormData , registeruser)
router.route("/login").post(parseFormData , loginuser)
router.route("/logout").post(logoutUser)
router.route("/profile").get(verifyJWT,getCurrentUser) 
router.route("/atscheck").post(verifyJWT,CheckATSScore)
router.route("/upload").post( verifyJWT, upload.single("resume"), UploadResume);
router.route("/aiedit").post( verifyJWT,aiEditResume)
router.route("/docx").post( verifyJWT,exportResume)
router.route("/payment").post( verifyJWT,Payment)
router.route("/verify-payment").post( verifyJWT,VerifyPayment)
router.route("/mail").post(Mail)
router.route("/make-premium").post(makePremium)
router.route("/templates").post(upload.single("image"), createTemplate).get(getTemplates)
router.route("/templates/:id").get(getTemplateById).delete(deleteTemplate)
router.route("/make-admin").post(makeAdmin)
router.route("/reset-password").post(resetPassword)
router.route("/forgot-password").post(forgotPassword)
router.route("/get-all-users").get(verifyJWT, requireAdmin, getallusers)
export {router}