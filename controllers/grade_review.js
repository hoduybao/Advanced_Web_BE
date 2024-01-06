const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();
const Classroom = require("../model/class");
const json2csv = require('json2csv');
const User = require("../model/user");
const GradeDetail = require("../model/grade_detail");
const Notification = require("../model/notification");
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

        // Send notification to all teachers in the class
        const classTeachers = await Classroom.findById(existingGradeDetail.classroomId, 'teacherList');

        const cls = await Classroom.findById(existingGradeDetail.classroomId);

        const gradeStructureDetail = await getClassGradeById(_idgradestructure, cls.gradeStructure);

        if (classTeachers) {
            const teacherIds = classTeachers.teacherList.map(teacher => teacher.toString());

            // Create a notification for each teacher
            const notifications = teacherIds.map(teacherId => ({
                senderId: _idstudent,
                receiverId: teacherId,
                objectId: newGradeReview._id,
                objectName: 'Grade Review',
                message: `Student ${student.fullname} has submitted a grade review in score colunm ${gradeStructureDetail.title}`,
                url: `${process.env.CLIENT}/${cls.slug}`,  // Adjust the URL as needed
            }));

            // Insert notifications into the Notification collection
            const insertedNotifications = await Notification.insertMany(notifications);

            // const io = req.io;
            // // Gửi thông báo qua Socket.IO
            // const notificationDetails = insertedNotifications.map(notification => ({
            //     _id: notification._id,
            //     objectId: notification.objectId,
            //     objectName: notification.objectName,
            //     message: notification.message,
            //     url: notification.url,
            //     createdAt: notification.createdAt,
            // }));

            // teacherIds.forEach(teacherId => {
            //     io.to(teacherId).emit('newNotification', notificationDetails);
            // });
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
                },
                point: gradeDetail.point,
            };

            // Populate comments with author details
            const populatedComments = await Promise.all(review.comments.map(async comment => {
                const authorDetails = await User.findById(comment.author);
                return {
                    ...comment.toObject(),
                    authorDetails: {
                        _id: authorDetails._id,
                        fullname: authorDetails.fullname,
                        // Include other details you want to return
                    },
                };
            }));

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
                comments: populatedComments,
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

const ReturnGradeReviewDetails = async (reviewId) => {
    try {

        // Find the grade review based on the provided reviewId
        const review = await GradeReview.findById(reviewId);

        if (!review) {
            return;
        }

        // Find the corresponding grade detail
        const gradeDetail = await GradeDetail.findById(review.gradeDetail)
            .populate({
                path: 'studentId',
            });

        const classroom = await Classroom.findOne({ _id: review.classID });

        if (!classroom) {
            return;
        }

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
            },
            point: gradeDetail.point,
        };

        // Populate comments with author details
        const populatedComments = await Promise.all(review.comments.map(async comment => {
            const authorDetails = await User.findById(comment.author);
            return {
                ...comment.toObject(),
                authorDetails: {
                    _id: authorDetails._id,
                    fullname: authorDetails.fullname,
                    // Include other details you want to return
                },
            };
        }));

        // Customize the structure based on your requirements
        const formattedReview = {
            _id: review._id,
            classID: review.classID,
            gradeDetail: formattedGradeDetail,
            expectedPoint: review.expectedPoint,
            studentExplanation: review.studentExplanation,
            oldPoint: review.oldPoint,
            isFinalDecision: review.isFinalDecision,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            comments: populatedComments,
        };

        return formattedReview;
    } catch (error) {
        console.error(error);
        return;
    }
};


const ViewGradeReviewDetails = async (req, res) => {
    try {
        const { reviewId } = req.params;

        // Find the grade review based on the provided reviewId
        const review = await GradeReview.findById(reviewId);

        if (!review) {
            return res.status(400).json({
                success: false,
                message: 'Grade review not found',
            });
        }

        // Find the corresponding grade detail
        const gradeDetail = await GradeDetail.findById(review.gradeDetail)
            .populate({
                path: 'studentId',
            });

        const classroom = await Classroom.findOne({ _id: review.classID });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found',
            });
        }

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
            },
            point: gradeDetail.point,
        };

        // Populate comments with author details
        const populatedComments = await Promise.all(review.comments.map(async comment => {
            const authorDetails = await User.findById(comment.author);
            return {
                ...comment.toObject(),
                authorDetails: {
                    _id: authorDetails._id,
                    fullname: authorDetails.fullname,
                    // Include other details you want to return
                },
            };
        }));

        // Customize the structure based on your requirements
        const formattedReview = {
            _id: review._id,
            classID: review.classID,
            gradeDetail: formattedGradeDetail,
            expectedPoint: review.expectedPoint,
            studentExplanation: review.studentExplanation,
            oldPoint: review.oldPoint,
            isFinalDecision: review.isFinalDecision,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            comments: populatedComments,
        };

        res.status(200).json({
            success: true,
            data: formattedReview,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const MarkFinalDecision = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { newPoint } = req.body;

        // Find the grade review based on the provided reviewId
        const review = await GradeReview.findById(reviewId);

        if (!review) {
            return res.status(400).json({
                success: false,
                message: 'Grade review not found',
            });
        }

        // Update the final decision and new grade point
        review.isFinalDecision = true;

        // Save the updated review
        await review.save();

        // Optionally, you may want to update the corresponding GradeDetail as well
        const gradeDetail = await GradeDetail.findById(review.gradeDetail);

        if (gradeDetail) {
            gradeDetail.point = newPoint;
            await gradeDetail.save();
        }

        // Find the corresponding grade detail
        const gradeDetailToGetData = await GradeDetail.findById(review.gradeDetail)
            .populate({
                path: 'studentId',
            });

        const classroom = await Classroom.findOne({ _id: review.classID });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found',
            });
        }

        const dataGradeStructure = getClassGradeById(gradeDetailToGetData.gradeId._id, classroom.gradeStructure);

        // Include other GradeDetail information here
        const formattedGradeDetail = {
            _id: gradeDetailToGetData._id,
            gradeId: {
                _id: gradeDetailToGetData.gradeId._id,
                title: dataGradeStructure.title,
                percent: dataGradeStructure.grade,
            },
            studentId: {
                _id: gradeDetailToGetData.studentId._id,
                IDStudent: gradeDetailToGetData.studentId.IDStudent,
                fullname: gradeDetailToGetData.studentId.fullname,
            },
            point: gradeDetailToGetData.point,
        };

        // Populate comments with author details
        const populatedComments = await Promise.all(review.comments.map(async comment => {
            const authorDetails = await User.findById(comment.author);
            return {
                ...comment.toObject(),
                authorDetails: {
                    _id: authorDetails._id,
                    fullname: authorDetails.fullname,
                    // Include other details you want to return
                },
            };
        }));

        // Customize the structure based on your requirements
        const formattedReview = {
            _id: review._id,
            classID: review.classID,
            gradeDetail: formattedGradeDetail,
            expectedPoint: review.expectedPoint,
            studentExplanation: review.studentExplanation,
            oldPoint: review.oldPoint,
            isFinalDecision: review.isFinalDecision,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            comments: populatedComments,
        };


        const cls = await Classroom.findById(review.classID);


        // Send notification to the student
        const student = await User.findById(gradeDetailToGetData.studentId);
        if (student) {
            const notification = new Notification({
                senderId: req.user._id,  // ID của người thực hiện thao tác (giáo viên)
                receiverId: student._id,
                objectId: review._id,
                objectName: 'Grade Review',
                message: `Your grade review for ${dataGradeStructure.title} in class ${cls.title} has been finalized. Check the updated grade.`,
                url: `${process.env.CLIENT}/${cls.slug}`,  // Adjust the URL as needed
            });

            await notification.save();
        }


        res.status(200).json({
            success: true,
            message: 'Final decision marked successfully',
            data: formattedReview,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const AddCommentToReview = async (req, res) => {
    try {
        const author = req.user._id;
        const { reviewId, content } = req.body;

        const review = await GradeReview.findById(reviewId)
            .populate({
                path: 'gradeDetail',
                populate: {
                    path: 'studentId',
                    model: 'User', // hoặc tên model của người dùng
                    select: 'IDStudent fullname'
                },
            });

        if (!review) {
            return res.status(400).json({
                success: false,
                message: 'Grade review not found',
            });
        }

        // Add the new comment to the comments array
        const newComment = {
            author,
            content,
        };
        review.comments.push(newComment);

        // Save the updated review
        await review.save();


        const cls = await Classroom.findById(review.classID);

        const isTeacher = cls.teacherList.includes(author);

        const dataGradeStructure = getClassGradeById(review.gradeDetail.gradeId, cls.gradeStructure);

        if (isTeacher) {
            const notification = new Notification({
                senderId: author,
                receiverId: review.gradeDetail.studentId._id,
                objectId: reviewId,
                objectName: 'Grade Review',
                message: `The teacher has commented on your grade review for ${dataGradeStructure.title} in class ${cls.title}`,
                url: `${process.env.CLIENT}/${cls.slug}`,
            });

            await notification.save();
        } else {
            // Gửi thông báo đến toàn bộ giáo viên trong lớp
            const teacherNotifications = cls.teacherList.map(teacherId => {
                return new Notification({
                    senderId: author,
                    receiverId: teacherId,
                    objectId: reviewId,
                    objectName: 'Grade Review',
                    message: `Student ${review.gradeDetail.studentId.fullname} has commented in grade review for ${dataGradeStructure.title} in class ${cls.title}`,
                    url: `${process.env.CLIENT}/${cls.slug}`,
                });
            });

            await Notification.insertMany(teacherNotifications);
        }


        res.status(200).json({
            success: true,
            message: 'Comment added successfully',
            data: await ReturnGradeReviewDetails(reviewId),
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
    ViewGradeReviews,
    ViewGradeReviewDetails,
    MarkFinalDecision,
    AddCommentToReview
};
