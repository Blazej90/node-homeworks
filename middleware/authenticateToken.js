const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authenticateToken(req, res, next) {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
      userId: decoded.userId,
      avatarURL: user.avatarURL,
    };
    next();
  } catch (error) {
    console.error("Error during token verification:", error);
    return res
      .status(401)
      .json({ message: "Unauthorized. Invalid or expired token" });
  }
}

module.exports = authenticateToken;
