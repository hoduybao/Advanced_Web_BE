const mongoose = require("mongoose");
const gradeDetailSchema = new mongoose.Schema(
    {
        classroomId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'Class',
        },
        studentId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        gradeId: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'Class.gradeStructure',
        },
        point: {
            type: Number,
            min: [0, 'Điểm không được bé hơn 0'],
            max: [100, 'Điểm không được vượt quá 100'],
            default: 0,
        },
        hasReviewed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Grade_detail", gradeDetailSchema);

