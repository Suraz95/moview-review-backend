const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: true,
  },
  role: {
    type: String,
    required: true,
    default: "member",
    enum: ["admin", "member"], // either of these 2 values can be accepted
  },
});

// pre Middleware for hashing Password
UserSchema.pre("save", async function (next) {
  // const salt = await bcrypt.genSalt(10);
  // this.password = await bcrypt.hash(this.password, salt);
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function (newPassword) {
  const result = await bcrypt.compare(newPassword, this.password);
  return result;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
