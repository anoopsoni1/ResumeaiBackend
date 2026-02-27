import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadonCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "raw",
             folder: "resumes" ,
             access_mode: "public"
        })
        fs.unlinkSync(localFilePath)

        
         return response;
        

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

/** Upload template image to Cloudinary (folder: templates, resource_type: image). Returns { response } or { error }. */
const uploadTemplateImage = async (localFilePath) => {
  try {
    if (!localFilePath) return { error: "No file path" };
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
      folder: "templates",
      access_mode: "public",
    });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return { response };
  } catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch {}
    }
    const msg = error?.message || "Upload failed";
    const httpCode = error?.http_code;
    return { error: msg, httpCode };
  }
};

// upload audio to cloudinary
const uploadAudioToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "audio",
      folder: "audios",
      access_mode: "public",
    });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  }
  catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
}
export { uploadonCloudinary, uploadTemplateImage, uploadAudioToCloudinary };