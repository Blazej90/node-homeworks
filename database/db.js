const mongoose = require("mongoose");

const uri =
  "mongodb+srv://blazejdeveloper:sauSEoQGBsYGnNgR@cluster0.9i9f2gc.mongodb.net/db-contacts?";

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose
  .connect(uri, options)
  .then(() => {
    console.log("Connection with MongoDB database successful!");
  })
  .catch((error) => {
    console.error("MongoDB database connection error:", error);
    console.error("Failed to connect to MongoDB database!");
    process.exit(1);
  });

mongoose.connection.on("connected", () => {
  console.log("Database connection successful");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB database connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.log("Disconnected from MongoDB database");
});

module.exports = mongoose.connection;
