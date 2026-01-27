import multer from 'multer';

const upload = multer();


const parseFormData = upload.none();

export default parseFormData;
