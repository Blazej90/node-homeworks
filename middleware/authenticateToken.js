const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized. Missing token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res
        .status(401)
        .json({ message: "Unauthorized. Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

module.exports = authenticateToken;
