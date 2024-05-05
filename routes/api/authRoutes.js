const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.JWT_SECRET;
const mongoose = require("mongoose");
const User = require("../../models/user");
const multer = require("multer");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

const tmpFolderPath = "../../tmp";
const avatarsFolderPath = "../../public/avatars";

// Funkcja przeniesienia awatara
async function moveAvatarToPublicFolder(avatarFileName) {
  const tmpFilePath = path.join(tmpFolderPath, avatarFileName);
  const avatarDestination = path.join(avatarsFolderPath, avatarFileName);

  return new Promise((resolve, reject) => {
    fs.rename(tmpFilePath, avatarDestination, (err) => {
      if (err) {
        console.error("Error moving avatar file:", err);
        reject(err);
      } else {
        console.log("Avatar file moved successfully");
        resolve();
      }
    });
  });
}

// Tworzenie transportera e-maili z użyciem Mailtrap
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_API_KEY,
    pass: process.env.MAILTRAP_API_KEY,
  },
});

require("dotenv").config();
console.log(process.env.JWT_SECRET);
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
      console.error("Error during token verification:", err);
      return res.status(401).json({ message: "Not authorized" });
    }
    req.user = user;
    next();
  });
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/avatars");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Endpoint do przesyłania obrazów
router.post("/upload", upload.single("avatar"), (req, res) => {
  res.status(200).json({ message: "File uploaded successfully" });
});

// Endpoint rejestracji nowego użytkownika
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const verificationToken = uuidv4();
    console.log("Verification Token:", verificationToken);

    const newUser = new User({ email, password, verificationToken });
    await newUser.save();

    const mailOptions = {
      from: "blazej.developer@gmail.com",
      to: "example@example.com",
      subject: "Account Verification",
      html: `<p>Click <a href="http://demomailtrap.com/users/verify/${verificationToken}">here</a> to verify your account.</p>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint aktualizacji awatara użytkownika
router.patch(
  "/avatars",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.userId;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const avatarTmpPath = req.file.path;

      const avatar = await Jimp.read(avatarTmpPath);
      await avatar.resize(250, 250);

      const avatarFileName = `${userId}_${Date.now()}.${avatar.getExtension()}`;

      await moveAvatarToPublicFolder(avatarFileName);
      const avatarURL = `/avatars/${avatarFileName}`;
      user.avatarURL = avatarURL;
      await user.save();

      res.status(200).json({ avatarURL });
    } catch (error) {
      console.error("Error updating user avatar:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// Endpoint do weryfikacji emaila na podstawie tokena
router.get("/verify/:verificationToken", async (req, res) => {
  try {
    const verificationToken = req.params.verificationToken;

    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.verificationToken = null;
    user.verify = true;
    await user.save();

    res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/users/verify", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing required field: email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    const verificationToken = uuidv4();
    user.verificationToken = verificationToken;
    await user.save();

    const mailOptions = {
      from: "blazej.developer@gmail.com",
      to: "example@example.com",
      subject: "Account Verification",
      html: `<p>Click <a href="http://demomailtrap.com/users/verify/${verificationToken}">here</a> to verify your account.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error resending verification email:", error);
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
      expiresIn: "12h",
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

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

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
router.get("/logout", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
      avatarURL: user.avatarURL,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
