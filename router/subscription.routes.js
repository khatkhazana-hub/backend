const router = require("express").Router();
const {
  createSubscription,
  getSubscriptions,
  deleteSubscription,
} = require("../controllers/subscription.controller");

router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getSubscriptions);
router.delete("/subscriptions/:id", deleteSubscription);

module.exports = router;
