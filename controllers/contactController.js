// controllers/contactController.js
const Contact = require("../models/Contact");
const { sendMail } = require("../utils/mailer");

// small helper to avoid repeating try/catch everywhere
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// basic server-side guard (frontend already enforces)
const requireFields = (body, fields) => {
  const missing = fields.filter((f) => !body[f] || String(body[f]).trim() === "");
  if (missing.length) {
    const err = new Error(`Missing required field(s): ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
};

exports.createContact = asyncHandler(async (req, res) => {
  // enforce required only for name + email
  requireFields(req.body, ["name", "email"]);

  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
    zip,
    message,
    subscribe,
  } = req.body;

  const doc = await Contact.create({
    name: name?.trim(),
    email: email?.trim(),
    phone: phone?.trim(),
    address: address?.trim(),
    city: city?.trim(),
    state: state?.trim(),
    country: country?.trim(),
    zip: zip?.trim(),
    message: message?.trim(),
    subscribe: !!subscribe,
  });

  // notify owner (you)
  try {
    await sendMail({
      to: "shazimages@gmail.com",
      subject: `New Contact Submission: ${doc.name}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;">
          <h2>New Contact Submission</h2>
          <p><strong>Name:</strong> ${doc.name}</p>
          <p><strong>Email:</strong> ${doc.email}</p>
          ${doc.phone ? `<p><strong>Phone:</strong> ${doc.phone}</p>` : ""}
          ${doc.address ? `<p><strong>Address:</strong> ${doc.address}</p>` : ""}
          <p><strong>City/State/Country/Zip:</strong> 
            ${doc.city || "-"} / ${doc.state || "-"} / ${doc.country || "-"} / ${doc.zip || "-"}
          </p>
          ${doc.subscribe ? `<p>📬 <strong>Requested to subscribe</strong></p>` : ""}
          ${doc.message ? `<p><strong>Message:</strong><br>${doc.message.replace(/\n/g, "<br/>")}</p>` : ""}
          <hr/>
          <p style="color:#666;font-size:12px;">
            IP: ${doc.meta?.ip || "-"}<br/>
            UA: ${doc.meta?.ua || "-"}
          </p>
          <p style="color:#999;font-size:12px;">Created: ${doc.createdAt.toISOString()}</p>
        </div>
      `,
    });
  } catch (e) {
    // don't fail the API just because email failed; log + continue
    console.error("Owner notification email failed:", e?.message || e);
  }

  return res.status(201).json({ success: true, data: doc });
});

exports.getContacts = asyncHandler(async (req, res) => {
  // tiny pagination + optional email/name search
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const q = (req.query.q || "").trim();

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { message: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Contact.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

exports.getContactById = asyncHandler(async (req, res) => {
  const item = await Contact.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }
  res.json({ success: true, data: item });
});

// optional update (good to have in admin UI)
exports.updateContact = asyncHandler(async (req, res) => {
  const allowed = [
    "name",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "zip",
    "message",
    "subscribe",
  ];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
  }

  const updated = await Contact.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }

  res.json({ success: true, data: updated });
});

exports.deleteContact = asyncHandler(async (req, res) => {
  const deleted = await Contact.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Contact not found" });
  }
  res.json({ success: true, message: "Deleted" });
});
