const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();
const Classroom = require("../model/class");
const json2csv = require('json2csv');
const User = require("../model/user");
const GradeDetail = require("../model/grade_detail");
const csvParser = require('csv-parser');
const GradeReview = require("../model/grade_review");

const PostGradeReviewFromStudent = async (req, res) => {
    try {
        const _idstudent = req.user._id;

        const { _idgradestructure, oldPoint, expectedPoint, studentExplanation } = req.body;

        // Check if the student exists
        const student = await User.findById(_idstudent);
        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Check if there is an existing GradeDetail
        const existingGradeDetail = await GradeDetail.findOne({
            studentId: _idstudent,
            gradeId: _idgradestructure,
        });

        let _idgradedetail;

        if (existingGradeDetail) {
            _idgradedetail = existingGradeDetail._id;
        } else {
            // If no existing GradeDetail, create a new ObjectId
            _idgradedetail = mongoose.Types.ObjectId();
        }
        // Create a new grade review
        const newGradeReview = new GradeReview({
            gradeDetail: _idgradedetail,
            classID: existingGradeDetail.classroomId,
            expectedPoint,
            oldPoint,
            studentExplanation
        });

        await newGradeReview.save();

        // Update GradeDetail to set hasReviewed to true
        if (existingGradeDetail) {
            await GradeDetail.findByIdAndUpdate(existingGradeDetail._id, {
                $set: { hasReviewed: true },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Grade review request submitted successfully',
            data: newGradeReview,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const getClassGradeById = (gradeId, gradeStructure) => {
    const foundGrade = gradeStructure.find(grade => grade._id.toString() === gradeId.toString());

    if (foundGrade) {
        return {
            _id: foundGrade._id,
            title: foundGrade.title,
            grade: foundGrade.grade,
            isFinalized: foundGrade.isFinalized
        };
    }
};

const ViewGradeReviews = async (req, res) => {
    try {
        const { slugClass } = req.params;

        // Find the class based on the provided slug
        const classroom = await Classroom.findOne({ slug: slugClass });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found',
            });
        }

        // Find all grade reviews for the specified class
        const gradeReviews = await GradeReview.find({ classID: classroom._id });

        const formattedReviews = await Promise.all(gradeReviews.map(async review => {
            const gradeDetail = await GradeDetail.findById(review.gradeDetail)
                .populate({
                    path: 'studentId'
                });

            const dataGradeStructure = getClassGradeById(gradeDetail.gradeId._id, classroom.gradeStructure);
            // Include other GradeDetail information here
            const formattedGradeDetail = {
                _id: gradeDetail._id,
                gradeId: {
                    _id: gradeDetail.gradeId._id,
                    title: dataGradeStructure.title,
                    percent: dataGradeStructure.grade,
                },
                studentId: {
                    _id: gradeDetail.studentId._id,
                    IDStudent: gradeDetail.studentId.IDStudent,
                    fullname: gradeDetail.studentId.fullname,
                    // Include other User information here
                },
                // Include other GradeDetail information here
            };
            // Customize the structure based on your requirements
            return {
                _id: review._id,
                classID: review.classID,
                gradeDetail: formattedGradeDetail,
                expectedPoint: review.expectedPoint,
                studentExplanation: review.studentExplanation,
                oldPoint: review.oldPoint,
                isFinalDecision: review.isFinalDecision,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
            };
        }));

        res.status(200).json({
            success: true,
            data: formattedReviews,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

module.exports = {
    PostGradeReviewFromStudent,
    ViewGradeReviews
};
