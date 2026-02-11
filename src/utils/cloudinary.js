const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = (file, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    ).end(file.buffer);
  });
};

const getPublicIdFromUrl = (url) => {
  
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    let path = parts[1];
    
    path = path.replace(/^v\d+\//, '');
    
    const lastDot = path.lastIndexOf('.');
    if (lastDot > 0) {
      path = path.substring(0, lastDot);
    }
    
    return path;
  } catch (error) {
    console.error('Error parsing Cloudinary URL:', error);
    return null;
  }
};

const deleteImage = async (publicId) => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  getPublicIdFromUrl,
  deleteImage
};