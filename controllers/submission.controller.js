const Submission = require("../models/Submission");

// const toFileMeta = (file) =>
//   file
//     ? {
//         originalName: file.originalname,
//         mimeType: file.mimetype,
//         size: file.size,
//         filename: file.filename,
//         path: `/uploads/${file.mimetype?.startsWith("audio/") ? "audio" : "images"}/${file.filename}`,
//       }
//     : undefined;


const toFileMeta = (file) => {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.key,   // multer-s3 gives full S3 URL here
    filename: file.key.split("/").pop(),   // object key inside bucket
  };
};

    

// "Yes"/"No" -> boolean
const yesNoToBool = (v) => String(v || "").trim().toLowerCase() === "yes";

exports.createSubmission = async (req, res) => {
  try {
    const files = req.files || {};

    // Files from form field names
    const letterImage     = files.letterImage?.[0]     ? toFileMeta(files.letterImage[0])     : undefined;
    const photoImage      = files.photoImage?.[0]      ? toFileMeta(files.photoImage[0])      : undefined;
    const letterAudioFile = files.letterAudioFile?.[0] ? toFileMeta(files.letterAudioFile[0]) : undefined;
    const photoAudioFile  = files.photoAudioFile?.[0]  ? toFileMeta(files.photoAudioFile[0])  : undefined;

    const payload = {
      // Personal
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,

      // Confirmations (booleans)
      hasReadGuidelines:     yesNoToBool(req.body.guidelines),
      agreedTermsSubmission: yesNoToBool(req.body.termsSubmission),

      // Upload type
      uploadType: req.body.uploadType,

      // Letter
      title: req.body.Title, // note the capital T in your form
      letterCategory: req.body.letterCategory,
      letterLanguage: req.body.letterLanguage,
      decade: req.body.decade,
      letterImage,
      letterNarrativeFormat: req.body.letterNarrativeFormat || "text",
      letterNarrative: req.body.letterNarrative,
      letterAudioFile,
      letterNarrativeOptional: req.body.letterNarrativeOptional,

      // Photo
      photoCaption: req.body.photoCaption,
      photoPlace: req.body.photoPlace,
      photoImage,
      photoNarrativeFormat: req.body.photoNarrativeFormat || "text",
      photoNarrative: req.body.photoNarrative,
      photoAudioFile,
      photoNarrativeOptional: req.body.photoNarrativeOptional,

      // Verification
      before2000: req.body.before2000 || "No",
    };

    // Basic server-side guards
    if (!payload.fullName || !payload.email) {
      return res.status(400).json({ message: "fullName and email are required." });
    }
    if (!payload.uploadType) {
      return res.status(400).json({ message: "uploadType is required." });
    }
    if (!payload.hasReadGuidelines) {
      return res.status(400).json({ message: "Please confirm you've read the submission guidelines." });
    }
    if (!payload.agreedTermsSubmission) {
      return res.status(400).json({ message: "You must agree to the terms of submission." });
    }

    const doc = await Submission.create(payload);

    res.status(201).json({
      message: "Submission saved.",
      submissionId: doc._id,
      data: doc,
    });
  } catch (err) {
    console.error("createSubmission error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const docs = await Submission.find().sort({ createdAt: -1 }).limit(50);
    res.json(docs);
  } catch (err) {
    console.error("getSubmissions error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const doc = await Submission.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("getSubmissionById error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


exports.approveSubmission = async (req, res) => {
  try {
    const doc = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Submission approved", data: doc });
  } catch (err) {
    console.error("approveSubmission error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

// Reject
exports.rejectSubmission = async (req, res) => {
  try {
    const doc = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Submission rejected", data: doc });
  } catch (err) {
    console.error("rejectSubmission error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};
