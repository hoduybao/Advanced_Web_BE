const mongoose = require("mongoose"); // Erase if already required

var pendingInviteSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
        },
        classID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class',
            required: true,
        },
        role: {
            type: String,
        },
        isValid: {
            type: Boolean,
        },
        emailToken: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

//Export the model
module.exports = mongoose.model("Pending_Invite", pendingInviteSchema);
