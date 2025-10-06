const express = require("express");
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

router.post("/submissions", upload.fields(fields), createSubmission);
router.get("/submissions", getSubmissions);
router.get("/submissions/:id", getSubmissionById);
router.patch("/submissions/:id", upload.fields(fields), updateSubmission);
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
