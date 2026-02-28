import { Router } from "express";
import { getCurrentUser, loginuser, logoutUser, registeruser } from "../controller/user.controller.js";
import parseFormData from "../middleware/parse.middlerware.js";
import {CheckATSScore} from "../controller/atschecker.controller.js"
import { upload, uploadRecording as multerRecording } from "../middleware/multer.middleware.js"
import { aiEditResume, exportResume, UploadResume } from "../controller/Uploadresume.controller.js";
import { Payment, VerifyPayment } from "../controller/payment.controller.js";
 import { verifyJWT, requireAdmin } from "../middleware/auth.middleware.js";
 import { uploadAudioToCloudinary } from "../utils/Cloudinary.js";
 import Mail from "../controller/email.controller.js";
 import { makePremium, makeAdmin, forgotPassword, verifyForgotOtp, resetPasswordAfterOtp, getallusers, updateAccountDetails } from "../controller/user.controller.js";
 import {
    createTemplate,
    getTemplates,
    getTemplateById,
    deleteTemplate,
  } from "../controller/template.controller.js";
import { createAtsscore, getAtsscore, updateAtsscore, createOptimize, getOptimize, updateOptimize } from "../controller/atsscore.controller.js";
import { createInterview, getMyInterviews, getInterviewById, updateInterview } from "../controller/videocallInterview.controller.js";
import { uploadRecording } from "../middleware/audio.middleware.js";
import { getNextAiQuestion } from "../controller/aiInterview.controller.js";
import { transcribeAudio } from "../controller/transcription.controller.js";
import { evaluateInterview } from "../controller/Audiocheck.controller.js";
import { createDetail, getDetail, updateDetail, deleteDetail } from "../controller/details.controller.js";
import { getEditedResume, saveEditedResume } from "../controller/editedResume.controller.js";

const router = Router()

router.route("/register").post(parseFormData , registeruser)
router.route("/login").post(parseFormData , loginuser)
router.route("/logout").post(logoutUser)
router.route("/profile").get(verifyJWT, getCurrentUser).patch(verifyJWT, updateAccountDetails) 
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
router.route("/forgot-password").post(forgotPassword)
router.route("/verify-forgot-otp").post(verifyForgotOtp)
router.route("/reset-password").post(resetPasswordAfterOtp)
router.route("/get-all-users").get(verifyJWT, requireAdmin, getallusers)
router.route("/create-atsscore").post(verifyJWT, createAtsscore)
router.route("/get-atsscore").get(verifyJWT, getAtsscore)
router.route("/update-atsscore/:id").put(verifyJWT, updateAtsscore)
router.route("/create-optimize").post(verifyJWT, createOptimize)
router.route("/get-optimize").get(verifyJWT, getOptimize)
router.route("/update-optimize/:id").put(verifyJWT, updateOptimize)
router.route("/upload-audio").post(upload.single("audio"), uploadAudioToCloudinary)
router.route("/interviews").post(verifyJWT, createInterview).get(verifyJWT, getMyInterviews)
router.route("/interviews/:id").get(verifyJWT, getInterviewById).put(verifyJWT, updateInterview)
router.route("/interviews/:id/upload-recording").post(verifyJWT, multerRecording.single("recording"), uploadRecording)
router.route("/interviews/:id/ai-question").post(verifyJWT, getNextAiQuestion)
router.route("/transcribe").post(verifyJWT, transcribeAudio)
router.route("/evaluate-interview").post(verifyJWT, evaluateInterview)
router.route("/create-detail").post(verifyJWT, createDetail)
router.route("/get-detail").get(verifyJWT, getDetail)
router.route("/update-detail/:id").put(verifyJWT, updateDetail)
router.route("/delete-detail/:id").delete(verifyJWT, deleteDetail)
router.route("/get-edited-resume").get(verifyJWT, getEditedResume)
router.route("/save-edited-resume").post(verifyJWT, saveEditedResume)

export {router}