// const path = require("path");
// const fs = require("fs");
// const multer = require("multer");

// const ensureDir = (dir) => {
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const isAudio = file.mimetype.startsWith("audio/");
//     const dir = path.join(__dirname, "..", "uploads", isAudio ? "audio" : "images");
//     ensureDir(dir);
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
//     cb(null, `${Date.now()}_${base}${ext}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const isImage = file.mimetype.startsWith("image/");
//   const isAudio = file.mimetype.startsWith("audio/");
//   if (!isImage && !isAudio) {
//     return cb(new Error("Only image/* and audio/* files are allowed"), false);
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });

// module.exports = {
//   upload,
// };




const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

// 1) region MUST match your bucket (Ohio = us-east-2)
const s3 = new S3Client({ region: "us-east-2" });

// 2) helper to route files into images/ or audio/
function s3Key(req, file, cb) {
  const isAudio = file.mimetype.startsWith("audio/");
  const folder = isAudio ? "audio" : "images";
  const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
  const name = `${Date.now()}_${file.fieldname}.${ext}`;
  cb(null, `public/${folder}/${name}`);        // <-- keep under public/
}

const upload = multer({
  storage: multerS3({
    s3,
    bucket: "khatkhazana",                      // <-- ensure exact bucket name
    // ❌ DO NOT set `acl` when the bucket has "bucket owner enforced"
    contentType: multerS3.AUTO_CONTENT_TYPE,    // sets correct Content-Type
    cacheControl: "public, max-age=31536000, immutable",
    key: s3Key,
  }),
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype.startsWith("audio/");
    cb(ok ? null : new Error("Only image/* and audio/* allowed"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 },       // 10MB; change if you want
});

module.exports = { upload };


