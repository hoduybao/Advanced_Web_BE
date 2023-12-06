const mongoose = require("mongoose"); // Erase if already required

var userClassSchema = new mongoose.Schema(
    {
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Update with the actual model name
            required: true,
        },
        classID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class', // Update with the actual model name
            required: true,
        },
        Role: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

//Export the model
module.exports = mongoose.model("User_Class", userClassSchema);
