const fs = require("fs");
const path = require("path");
const Submission = require("../models/Submission");

const toFileMeta = (file) => {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.key, // multer-s3 gives full S3 URL here
    filename: file.key.split("/").pop(), // object key inside bucket
  };
};

function toDiskPath(metaOrPath) {
  if (!metaOrPath) return null;

  const raw = typeof metaOrPath === "string" ? metaOrPath : metaOrPath.path;
  if (!raw) return null;

  // normalize slashes + strip leading slashes
  let rel = String(raw).replace(/^[\\/]+/, "");

  // if the DB stored "images/foo.png" (no 'public/'), prepend it
  if (!rel.startsWith("public" + path.sep) && !rel.startsWith("public/")) {
    // but if it already contains 'public' somewhere, keep it
    if (!/^public[\\/]/i.test(rel)) {
      rel = path.join("public", rel);
    }
  }

  // if it's already absolute, just return as-is
  if (path.isAbsolute(rel)) return rel;

  // resolve relative to project root
  return path.resolve(process.cwd(), rel);
}

const safeUnlink = (absPath) => {
  if (!absPath) return;
  fs.unlink(absPath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("unlink error:", absPath, err.message);
    }
  });
};

const yesNoToBool = (v) =>
  ["yes", "true", true, "on", "1"].includes(String(v).toLowerCase());

exports.createSubmission = async (req, res) => {
  try {
    const files = req.files || {};

    // Files from form field names
    const letterImage = files.letterImage?.[0]
      ? toFileMeta(files.letterImage[0])
      : undefined;
    const photoImage = files.photoImage?.[0]
      ? toFileMeta(files.photoImage[0])
      : undefined;
    const letterAudioFile = files.letterAudioFile?.[0]
      ? toFileMeta(files.letterAudioFile[0])
      : undefined;
    const photoAudioFile = files.photoAudioFile?.[0]
      ? toFileMeta(files.photoAudioFile[0])
      : undefined;

    const payload = {
      // Personal
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,

      // Confirmations (booleans)
      hasReadGuidelines: yesNoToBool(req.body.guidelines),
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

      // featured
      featuredLetter: yesNoToBool(req.body.featuredLetter || false),
      featuredPhoto: yesNoToBool(req.body.featuredPhoto || false),
    };

    // Basic server-side guards
    if (!payload.fullName || !payload.email) {
      return res
        .status(400)
        .json({ message: "fullName and email are required." });
    }
    if (!payload.uploadType) {
      return res.status(400).json({ message: "uploadType is required." });
    }
    if (!payload.hasReadGuidelines) {
      return res.status(400).json({
        message: "Please confirm you've read the submission guidelines.",
      });
    }
    if (!payload.agreedTermsSubmission) {
      return res
        .status(400)
        .json({ message: "You must agree to the terms of submission." });
    }

    const doc = await Submission.create(payload);

    res.status(201).json({
      message: "Submission saved.",
      submissionId: doc._id,
      data: doc,
    });
  } catch (err) {
    console.error("createSubmission error:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const docs = await Submission.find().sort({ createdAt: -1 }).limit(50);
    res.json(docs);
  } catch (err) {
    console.error("getSubmissions error:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const doc = await Submission.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    console.error("getSubmissionById error:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.updateSubmission = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await Submission.findById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const files = req.files || {};
    const patch = {};

    // text fields (only set if present)
    const setIf = (key, srcKey = key) => {
      if (req.body[srcKey] !== undefined) patch[key] = req.body[srcKey];
    };

    setIf("fullName");
    setIf("email");
    setIf("phone");
    setIf("location");
    setIf("uploadType");
    setIf("title", "Title"); // careful: your create uses capital T
    setIf("letterCategory");
    setIf("letterLanguage");
    setIf("decade");
    setIf("letterNarrativeFormat");
    setIf("letterNarrative");
    setIf("letterNarrativeOptional");
    setIf("photoCaption");
    setIf("photoPlace");
    setIf("photoNarrativeFormat");
    setIf("photoNarrative");
    setIf("photoNarrativeOptional");
    setIf("before2000");
    setIf("status"); // only if you allow status to be edited

    // booleans the same way your create handled them (if you sent yes/no)
    if (req.body.guidelines !== undefined) {
      patch.hasReadGuidelines = ["yes", "true", true, "on", "1"].includes(
        String(req.body.guidelines).toLowerCase()
      );
    }
    if (req.body.termsSubmission !== undefined) {
      patch.agreedTermsSubmission = ["yes", "true", true, "on", "1"].includes(
        String(req.body.termsSubmission).toLowerCase()
      );
    }

    // featured toggle
    // NEW: featured toggles
    if (req.body.featuredLetter !== undefined) {
      patch.featuredLetter = yesNoToBool(req.body.featuredLetter);
    }
    if (req.body.featuredPhoto !== undefined) {
      patch.featuredPhoto = yesNoToBool(req.body.featuredPhoto);
    }

    // handle optional file replacements
    const toFileMeta = (f) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      filename: f.filename,
      destination: f.destination?.replace(/^[./]+/, ""),
      path: (f.path || "").replace(/^[./]+/, ""), // stored relative
      size: f.size,
    });

    const replaceFile = (field) => {
      const f = files[field]?.[0];
      if (!f) return;
      const meta = toFileMeta(f);
      // schedule deletion of previous file for this field
      const oldMeta = existing[field];
      if (oldMeta?.path) safeUnlink(toDiskPath(oldMeta));
      patch[field] = meta;
    };

    replaceFile("letterImage");
    replaceFile("photoImage");
    replaceFile("letterAudioFile");
    replaceFile("photoAudioFile");

    const updated = await Submission.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    });

    return res.json({ message: "Submission updated.", data: updated });
  } catch (err) {
    console.error("updateSubmission error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await Submission.findById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    // delete stored files (best-effort)
    ["letterImage", "photoImage", "letterAudioFile", "photoAudioFile"].forEach(
      (k) => {
        const meta = doc[k];
        if (meta?.path) safeUnlink(toDiskPath(meta));
      }
    );

    await Submission.findByIdAndDelete(id);
    return res.status(200).json({ message: "Submission deleted." });
  } catch (err) {
    console.error("deleteSubmission error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
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
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
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
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
