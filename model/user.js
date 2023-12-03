const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require('bcrypt')
const crypto = require('crypto')
// Declare the Schema of the Mongo model
var userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
      default: "https://res.cloudinary.com/dbaayx6nn/image/upload/v1700220004/googleclassroom/evoah8ejteno9pwaezrg.png",
      // required:true,
    },
    introduce: {
      type: String
    },
    address: {
      type: String,
    },
    dateofbirth: {
      type: Date,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String
    },
    verified: {
      type: Boolean
    },
    emailToken: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = bcrypt.genSaltSync(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods = {
  isCorrectPassword: async function (password) {
    return await bcrypt.compare(password, this.password)
  },
  createPasswordChangeToken: function (password) {
    const resetToken = crypto.randomBytes(32).toString('hex')
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    return resetToken;
  }
}

//Export the model
module.exports = mongoose.model("User", userSchema);
