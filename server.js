// server.js
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const DatabaseConnection = require("./config/Database");
const corsOptions = require("./config/corsOptions");
const submissionRoutes = require("./router/submission.routes");
const adminRoutes = require("./router/admin.routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes

app.use("/api", submissionRoutes);
app.use("/api/admin", adminRoutes);


app.listen(PORT, () => {
  DatabaseConnection();
  console.log(` 🟢 Server is running at http://localhost:${PORT}`);
});
