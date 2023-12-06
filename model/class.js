const mongoose = require("mongoose"); // Erase if already required

var classSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        subTitle: {
            type: String,
        },
        invitationCode: {
            type: String,
        },
        slug: {
            type: String,
        },
        gradeStructure: [
            {
                title: {
                    type: String,
                    required: true,
                },
                grade: {
                    type: Number,
                    required: true,
                },
                isFinalized: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        studentList: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        teacherList: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        owner: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

//Export the model
module.exports = mongoose.model("Class", classSchema);
