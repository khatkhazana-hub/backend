const fs = require("fs");
const path = require("path");
const Submission = require("../models/Submission");
const axios = require("axios");
const { sendMail } = require("../utils/mailer");

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



// exports.createSubmission = async (req, res) => {
//   try {
//     // --- 1️⃣ Verify Turnstile Captcha ---
//     const token = req.body["cf-turnstile-response"];
//     if (!token) {
//       return res.status(400).json({ message: "Captcha token missing." });
//     }

//     const verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
//     const secretKey = process.env.CLOUDFLARE_SECRET_KEY;

//     const { data } = await axios.post(
//       verifyURL,
//       new URLSearchParams({
//         secret: secretKey,
//         response: token,
//         remoteip: req.ip,
//       })
//     );

//     if (!data.success) {
//       console.error("❌ Turnstile verification failed:", data["error-codes"]);
//       return res.status(400).json({ message: "Captcha verification failed." });
//     }

//     // --- 2️⃣ Continue your original logic ---
//     const files = req.files || {};
//     const body = req.body || {};

//     const letterImagesArr = [...(files.letterImage || [])].map(toFileMeta);
//     const photoImagesArr = [...(files.photoImage || [])].map(toFileMeta);

//     const letterAudioFile = files.letterAudioFile?.[0]
//       ? toFileMeta(files.letterAudioFile[0])
//       : undefined;
//     const photoAudioFile = files.photoAudioFile?.[0]
//       ? toFileMeta(files.photoAudioFile[0])
//       : undefined;

//     const hasReadGuidelines = yesNoToBool(body.guidelines);
//     const agreedTermsSubmission = yesNoToBool(body.termsSubmission);
//     const featuredLetter = yesNoToBool(body.featuredLetter || false);
//     const featuredPhoto = yesNoToBool(body.featuredPhoto || false);

//     const payload = {
//       fullName: body.fullName,
//       email: body.email,
//       phone: body.phone,
//       location: body.location,
//       hasReadGuidelines,
//       agreedTermsSubmission,
//       uploadType: body.uploadType,
//       title: body.Title,
//       letterCategory: body.letterCategory,
//       letterLanguage: body.letterLanguage,
//       decade: body.decade,
//       letterImage: letterImagesArr,
//       letterNarrativeFormat: body.letterNarrativeFormat || "text",
//       letterNarrative: body.letterNarrative,
//       letterAudioFile,
//       photoCaption: body.photoCaption,
//       photoPlace: body.photoPlace,
//       photoImage: photoImagesArr,
//       photoNarrativeFormat: body.photoNarrativeFormat || "text",
//       photoNarrative: body.photoNarrative,
//       photoAudioFile,
//       before2000: body.before2000 || "No",
//       featuredLetter,
//       featuredPhoto,
//       notes: body.notes || "",
//     };

//     if (!payload.fullName || !payload.email) {
//       return res.status(400).json({ message: "Full name and email required." });
//     }
//     if (!payload.uploadType) {
//       return res.status(400).json({ message: "uploadType is required." });
//     }
//     if (!hasReadGuidelines) {
//       return res
//         .status(400)
//         .json({ message: "Please confirm you've read the submission guidelines." });
//     }
//     if (!agreedTermsSubmission) {
//       return res
//         .status(400)
//         .json({ message: "You must agree to the terms of submission." });
//     }
//     if ((payload.letterImage?.length || 0) === 0 && (payload.photoImage?.length || 0) === 0) {
//       return res.status(400).json({ message: "Please upload at least one image." });
//     }

//     const doc = await Submission.create(payload);

//     return res.status(201).json({
//       message: "Submission saved.",
//       submissionId: doc._id,
//       data: doc,
//     });
//   } catch (err) {
//     console.error("createSubmission error:", err);
//     return res.status(500).json({ message: "Internal server error", error: err.message });
//   }
// };

exports.createSubmission = async (req, res) => {
  try {
    // --- 1️⃣ Verify Turnstile Captcha ---
    const token = req.body["cf-turnstile-response"];
    if (!token) {
      return res.status(400).json({ message: "Captcha token missing." });
    }

    const verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const secretKey = process.env.CLOUDFLARE_SECRET_KEY;

    const { data } = await axios.post(
      verifyURL,
      new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: req.ip,
      })
    );

    if (!data.success) {
      console.error("❌ Turnstile verification failed:", data["error-codes"]);
      return res.status(400).json({ message: "Captcha verification failed." });
    }

    // --- 2️⃣ Continue original logic ---
    const files = req.files || {};
    const body = req.body || {};

    const letterImagesArr = [...(files.letterImage || [])].map(toFileMeta);
    const photoImagesArr = [...(files.photoImage || [])].map(toFileMeta);

    const letterAudioFile = files.letterAudioFile?.[0]
      ? toFileMeta(files.letterAudioFile[0])
      : undefined;
    const photoAudioFile = files.photoAudioFile?.[0]
      ? toFileMeta(files.photoAudioFile[0])
      : undefined;

    const hasReadGuidelines = yesNoToBool(body.guidelines);
    const agreedTermsSubmission = yesNoToBool(body.termsSubmission);
    const featuredLetter = yesNoToBool(body.featuredLetter || false);
    const featuredPhoto = yesNoToBool(body.featuredPhoto || false);

    const payload = {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      location: body.location,
      hasReadGuidelines,
      agreedTermsSubmission,
      uploadType: body.uploadType,
      title: body.Title,
      letterCategory: body.letterCategory,
      letterLanguage: body.letterLanguage,
      decade: body.decade,
      letterImage: letterImagesArr,
      letterNarrativeFormat: body.letterNarrativeFormat || "text",
      letterNarrative: body.letterNarrative,
      letterAudioFile,
      photoCaption: body.photoCaption,
      photoPlace: body.photoPlace,
      photoImage: photoImagesArr,
      photoNarrativeFormat: body.photoNarrativeFormat || "text",
      photoNarrative: body.photoNarrative,
      photoAudioFile,
      before2000: body.before2000 || "No",
      featuredLetter,
      featuredPhoto,
      notes: body.notes || "",
    };

    if (!payload.fullName || !payload.email) {
      return res.status(400).json({ message: "Full name and email required." });
    }
    if (!payload.uploadType) {
      return res.status(400).json({ message: "uploadType is required." });
    }
    if (!hasReadGuidelines) {
      return res
        .status(400)
        .json({ message: "Please confirm you've read the submission guidelines." });
    }
    if (!agreedTermsSubmission) {
      return res
        .status(400)
        .json({ message: "You must agree to the terms of submission." });
    }
    if ((payload.letterImage?.length || 0) === 0 && (payload.photoImage?.length || 0) === 0) {
      return res.status(400).json({ message: "Please upload at least one image." });
    }

    // --- 3️⃣ Save submission ---
    const doc = await Submission.create(payload);

    // --- 4️⃣ Send notification email ---
    try {
      await sendMail({
        to: "khatkhazana@gmail.com",
        subject: "📩 New Submission Received",
        html: `
          <h2>New Submission Received</h2>
          <p><b>Name:</b> ${doc.fullName}</p>
          <p><b>Email:</b> ${doc.email}</p>
          <p><b>Upload Type:</b> ${doc.uploadType}</p>
          <p><b>Title:</b> ${doc.title || "Untitled"}</p>
          <p><b>Location:</b> ${doc.location || "—"}</p>
          <p><b>Status:</b> ${doc.status}</p>
          <hr />
          <p><b>Notes:</b><br/>${doc.notes || "—"}</p>
          <br/>
          <p>🕒 Submitted at: ${new Date(doc.createdAt).toLocaleString()}</p>
        `,
      });
    } catch (mailErr) {
      console.error("⚠️ Failed to send admin email:", mailErr);
      // Don't block response on email failure
    }

    // --- 5️⃣ Respond to client ---
    return res.status(201).json({
      message: "Submission saved.",
      submissionId: doc._id,
      data: doc,
    });
  } catch (err) {
    console.error("createSubmission error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
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

    const setIf = (key, srcKey = key) => {
      if (req.body[srcKey] !== undefined) patch[key] = req.body[srcKey];
    };

    // text fields
    setIf("fullName");
    setIf("email");
    setIf("phone");
    setIf("location");
    setIf("uploadType");
    setIf("title", "Title");
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
    setIf("status");
    setIf("notes");

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
    if (req.body.featuredLetter !== undefined) {
      patch.featuredLetter = ["yes", "true", true, "on", "1"].includes(
        String(req.body.featuredLetter).toLowerCase()
      );
    }
    if (req.body.featuredPhoto !== undefined) {
      patch.featuredPhoto = ["yes", "true", true, "on", "1"].includes(
        String(req.body.featuredPhoto).toLowerCase()
      );
    }

    // files
    const newLetter = (files.letterImage || []).map(toFileMeta);
    const newPhoto = (files.photoImage || []).map(toFileMeta);

    const replace =
      String(req.query.replaceImages || "").toLowerCase() === "true";

    // letterImage (array)
    if (newLetter.length) {
      if (replace) {
        // delete all existing letter images from disk only if you were storing locally; with S3, skip or implement S3 delete
        // existing.letterImage?.forEach(m => safeUnlink(toDiskPath(m)));
        patch.letterImage = newLetter;
      } else {
        patch.letterImage = [...(existing.letterImage || []), ...newLetter];
      }
    }

    // photoImage (array)
    if (newPhoto.length) {
      if (replace) {
        // existing.photoImage?.forEach(m => safeUnlink(toDiskPath(m)));
        patch.photoImage = newPhoto;
      } else {
        patch.photoImage = [...(existing.photoImage || []), ...newPhoto];
      }
    }

    // single audio files: replace on new upload
    if (files.letterAudioFile?.[0]) {
      patch.letterAudioFile = toFileMeta(files.letterAudioFile[0]);
      // optionally delete old local file if you used disk storage
    }
    if (files.photoAudioFile?.[0]) {
      patch.photoAudioFile = toFileMeta(files.photoAudioFile[0]);
    }

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

    // if you were deleting from disk, loop arrays; with S3 you likely skip or call S3 DeleteObject here
    // ["letterImage","photoImage"].forEach(k => (doc[k] || []).forEach(m => safeUnlink(toDiskPath(m))));
    // ["letterAudioFile","photoAudioFile"].forEach(k => doc[k]?.path && safeUnlink(toDiskPath(doc[k])));

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
