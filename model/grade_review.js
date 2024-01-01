const mongoose = require("mongoose");

const gradeReviewSchema = new mongoose.Schema(
    {
        gradeDetail: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'GradeDetail',
        },
        classID: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        oldPoint: {
            type: Number,
        },
        expectedPoint: {
            type: Number,
            required: true,
        },
        studentExplanation: {
            type: String,
        },
        isFinalDecision: {
            type: Boolean,
            default: false,
        },
        comments: [
            {
                author: {
                    type: mongoose.Types.ObjectId
                },
                content: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Grade_review", gradeReviewSchema);
