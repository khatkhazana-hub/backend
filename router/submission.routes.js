const express = require("express");
const router = express.Router();
const { upload } = require("../middleware/upload");
const {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  approveSubmission,
  rejectSubmission,
} = require("../controllers/submission.controller");

// Map EXACTLY to your form field names
const fields = [
  { name: "letterImage", maxCount: 1 },
  { name: "photoImage", maxCount: 1 },
  { name: "letterAudioFile", maxCount: 1 },
  { name: "photoAudioFile", maxCount: 1 },
];

router.post("/submissions", upload.fields(fields), createSubmission);
router.get("/submissions", getSubmissions);
router.get("/submissions/:id", getSubmissionById);


router.patch("/submissions/:id/approve", approveSubmission);
router.patch("/submissions/:id/reject", rejectSubmission);

module.exports = router;
