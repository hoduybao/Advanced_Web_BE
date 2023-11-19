const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ['jpg', 'png'],
  params: {
    folder: 'googleclassroom'
  }
});
const checkAvatarField = (req, res, next) => {
  if (!req.file) {
    // Nếu không có trường dữ liệu "avatar", bỏ qua việc tải lên và điều này chuyển đến hàm xử lý tiếp theo
    return res.status(400).json({ error: 'No avatar field found in the request' });
  }
  next();
};

const uploadCloud = multer({ storage });

module.exports = uploadCloud;