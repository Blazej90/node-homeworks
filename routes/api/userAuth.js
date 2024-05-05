const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const Joi = require("joi");
const User = require("../models/user");
const gravatar = require("gravatar");
const multer = require("multer");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

// Tworzenie instancji transportera e-maili z użyciem Mailtrap
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_API_KEY,
    pass: process.env.MAILTRAP_API_KEY,
  },
});

const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "tmp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post("/signup", async (req, res) => {
  try {
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }

    const verificationToken = uuidv4();

    // Tworzenie nowego użytkownika
    const newUser = new User({
      email: value.email,
      password: await bcrypt.hash(value.password, 10),
      subscription: "starter",
      avatarURL: gravatar.url(value.email, { s: "200", d: "identicon" }),
      verificationToken,
    });

    await newUser.save();

    // Wysyłanie e-maila z odnośnikiem do weryfikacji
    const mailOptions = {
      from: "blazej.developer@gmail.com",
      to: "example@example.com",
      subject: "Account Verification",
      html: `<p>Click <a href="http://demomailtrap.com/users/verify/${verificationToken}">here</a> to verify your account.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
        avatarURL: newUser.avatarURL,
      },
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/resend-verification-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing required field email" });
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

    const verificationToken = user.verificationToken;

    // Wysłanie ponownego e-maila z odnośnikiem do weryfikacji
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

router.get("/verify/:verificationToken", async (req, res) => {
  try {
    const verificationToken = req.params.verificationToken;

    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
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

module.exports = router;
