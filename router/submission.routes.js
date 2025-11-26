const express = require("express");
const multer = require("multer");
const router = express.Router();
const { upload } = require("../middleware/upload");
const {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  rejectSubmission,
  deleteSubmission,
  updateSubmission,
} = require("../controllers/submission.controller");

// Map EXACTLY to your form field names
const fields = [
  { name: "letterImage", maxCount: 20 },
  { name: "photoImage", maxCount: 20 },
  { name: "letterAudioFile", maxCount: 5 },
  { name: "photoAudioFile", maxCount: 5 },
];

const uploadFields = upload.fields(fields);

const handleMulterError = (err, res) => {
  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File too large. Max 10MB per file.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Too many files. Please upload fewer files.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Unexpected file field. Check the selected inputs.";
    }
    return res.status(400).json({ message });
  }
  return res.status(400).json({ message: err.message || "Upload failed." });
};

const withUpload = (handler) => (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) return handleMulterError(err, res);
    return handler(req, res, next);
  });
};

router.post("/submissions", withUpload(createSubmission));
router.get("/submissions", getSubmissions);
router.get("/submissions/:id", getSubmissionById);
router.patch("/submissions/:id", withUpload(updateSubmission));
router.delete("/submissions/:id", deleteSubmission);

router.post("/debug-upload", upload.any(), (req, res) => {
  const names = (req.files || []).map(f => f.fieldname);
  const counts = names.reduce((a, n) => ((a[n] = (a[n] || 0) + 1), a), {});
  console.log("DEBUG FIELDNAMES:", names);
  console.log("DEBUG COUNTS:", counts);
  return res.json({ names, counts });
});


router.patch("/submissions/:id/approve", approveSubmission);
router.patch("/submissions/:id/reject", rejectSubmission);

module.exports = router;
