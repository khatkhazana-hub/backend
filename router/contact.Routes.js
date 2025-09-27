// routes/contactRoutes.js
const express = require("express");
const {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} = require("../controllers/contactController");

const router = express.Router();

// /api/contacts
router.route("/")
  .post(createContact)  // create
  .get(getContacts);    // list with pagination/search

// /api/contacts/:id
router.route("/:id")
  .get(getContactById)  // read one
  .patch(updateContact) // update (optional but useful)
  .delete(deleteContact);

module.exports = router;
