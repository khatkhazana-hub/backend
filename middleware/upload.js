

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


