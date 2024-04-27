const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const mongoose = require("mongoose");
const User = require("../../models/user");

require("dotenv").config();
// console.log(process.env.JWT_SECRET);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

const router = express.Router();

// Funkcja middleware do weryfikacji tokena JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "Not authorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Not authorized" });
    }
    req.user = user;
    next();
  });
};

// Endpoint rejestracji nowego użytkownika
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// endpoint do zalogowania użytkownika
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Authentication failed. User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Authentication failed. Invalid password" });
    }

    const payload = {
      userId: user._id,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error("Error during user login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint chroniony tokenem JWT
router.get("/contacts", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    const decodedToken = jwt.verify(token, jwtSecret);

    const userId = decodedToken.userId;

    res
      .status(200)
      .json({ message: "Protected resource accessed successfully", userId });
  } catch (error) {
    console.error("Error during token verification:", error);
    res
      .status(401)
      .json({ message: "Authentication failed. Invalid or expired token" });
  }
});

// Endpoint wylogowania użytkownika
router.get("/logout", async (req, res) => {
  try {
    const decodedToken = jwt.verify(
      req.headers.authorization.split(" ")[1],
      jwtSecret
    );
    const userId = decodedToken.userId;

    await User.findByIdAndUpdate(userId, { token: null });

    res.status(204).send();
  } catch (error) {
    console.error("Error during user logout:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint bieżącego użytkownika
router.get("/current", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }
    res.status(200).json({
      email: user.email,
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
