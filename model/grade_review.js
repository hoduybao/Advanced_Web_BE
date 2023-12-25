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
        teacherComment: {
            type: String,
        },
        isFinalDecision: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Grade_review", gradeReviewSchema);
