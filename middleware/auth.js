// // middleware/auth.js
// const jwt = require("jsonwebtoken");

// module.exports = function auth(req, res, next) {
//   const header = req.headers.authorization || "";
//   const token = header.startsWith("Bearer ") ? header.slice(7) : null;
//   if (!token) return res.status(401).json({ message: "Missing token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");
//     req.user = decoded; // { sub, role, email }
//     next();
//   } catch (e) {
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };


// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authorization required." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");
    // shape: { sub, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
