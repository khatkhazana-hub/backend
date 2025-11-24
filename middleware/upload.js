// upload.js
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");
const mime = require("mime-types");
const crypto = require("crypto");

// --- S3 client: region MUST match your bucket region
const s3 = new S3Client({ region: "us-east-2" });

// Allowed MIME types (images)
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

// pick folder and filename; use mime to decide extension (don’t trust client name)
function s3Key(req, file, cb) {
  const isAudio = file.mimetype.startsWith("audio/");
  const isImage = file.mimetype.startsWith("image/");
  const folder = isAudio ? "audio" : isImage ? "images" : "other";

  const ext = mime.extension(file.mimetype) || "bin";
  const safeField = (file.fieldname || "file").replace(/[^\w-]/g, "");
  const unique = crypto.randomBytes(6).toString("hex"); // avoid S3 key collisions
  const name = `${Date.now()}_${unique}_${safeField}.${ext}`;

  cb(null, `public/${folder}/${name}`);
}

const upload = multer({
  storage: multerS3({
    s3,
    bucket: "khatkhazana",
    // don't set `acl` if bucket owner enforced
    contentType: multerS3.AUTO_CONTENT_TYPE,
    cacheControl: "public, max-age=31536000, immutable",
    key: s3Key,
    metadata: (req, file, cb) => {
      cb(null, {
        originalname: file.originalname,
      });
    },
  }),
  fileFilter: (req, file, cb) => {
    const isAudio = file.mimetype.startsWith("audio/");
    const isImage = file.mimetype.startsWith("image/");

    if (!isAudio && !isImage) {
      return cb(new Error("Only image/* and audio/* are allowed"), false);
    }

    // Strict image whitelist: JPEG, PNG, WebP, TIFF
    if (isImage && !ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(
        new Error("Unsupported image format. Allowed: JPEG, WebP, PNG, TIFF"),
        false
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (tune as needed)
    files: 20,                  // hard cap to mirror the UI
  },
});

module.exports = { upload, s3, ALLOWED_IMAGE_MIMES };
