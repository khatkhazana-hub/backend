const mongoose = require("mongoose");

const FileMetaSchema = new mongoose.Schema(
  {
    originalName: String,
    mimeType: String,
    size: Number,
    path: String, // public path like /uploads/images/xxx or /uploads/audio/xxx
    filename: String,
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    // Personal
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    location: String,

    // Confirmations (map "Yes"/"No" to boolean)
    hasReadGuidelines: { type: Boolean, default: false },
    agreedTermsSubmission: { type: Boolean, default: false },

    // Upload type
    uploadType: {
      type: String,
      enum: ["Letter", "Photographs", "Both"],
      required: true,
    },

    // Letter section
    title: String, // comes from req.body.Title
    letterCategory: String,
    letterLanguage: String,
    decade: String,
    letterImage: { type: [FileMetaSchema], default: [] }, // file
    letterNarrativeFormat: {
      type: String,
      enum: ["text", "audio", "both"],
      default: "text",
    },
    letterNarrative: String,
    letterAudioFile: FileMetaSchema, // file
    letterNarrativeOptional: String,

    // Photo section
    photoCaption: String,
    photoPlace: String,
    photoImage: { type: [FileMetaSchema], default: [] },
    photoNarrativeFormat: {
      type: String,
      enum: ["text", "audio", "both"],
      default: "text",
    },
    photoNarrative: String,
    photoAudioFile: FileMetaSchema, // file
    photoNarrativeOptional: String,

    // Verification
    before2000: { type: String, enum: ["Yes", "No"], default: "No" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    letterStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    photoStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    featuredLetter: { type: Boolean, default: false },
    featuredPhoto: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", SubmissionSchema);
