const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        receiverId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        objectId: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        objectName: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            default: '',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        url: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Notification', notificationSchema);
