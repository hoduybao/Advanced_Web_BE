const crypto = require("crypto");
require("dotenv").config();
const Classroom = require("../model/class");
const json2csv = require('json2csv');
const User = require("../model/user");
const GradeDetail = require("../model/grade_detail");

const DownloadStudentWithIdAndName = async (req, res) => {
    try {
        const { slug } = req.params;
        const cls = await Classroom.findOne({ slug }).populate('studentList');

        if (!cls) {
            return res.status(400).json({ message: 'Class not found' });
        }

        const studentData = cls.studentList.map(student => ({
            StudentId: student.IDStudent, // Assuming studentId is a field in your User model
            FullName: student.fullname,
        }));

        const fields = ['StudentId', 'FullName'];
        const csv = json2csv.parse(studentData, { fields });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=student-list-template-${cls._id}.csv`);

        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const DownloadStudentWithId = async (req, res) => {
    try {
        const { slug } = req.params;
        const cls = await Classroom.findOne({ slug }).populate('studentList');

        if (!cls) {
            return res.status(400).json({
                success: false,
                message: 'Class not found'
            });
        }

        const studentData = cls.studentList.map(student => ({
            StudentId: student.IDStudent
        }));

        const fields = ['StudentId'];
        const csv = json2csv.parse(studentData, { fields });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=student-list-template-${cls._id}.csv`);

        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const UploadGradeAGradeStructure = async (req, res) => {
    try {
        const { slugClass, gradeId } = req.params;

        const classroom = await Classroom.findOne({ slug: slugClass });
        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        const gradesData = [];
        req.file.buffer
            .toString()
            .split('\n')
            .forEach(row => {
                const [studentId, point] = row.split(',');
                if (studentId && point) {
                    gradesData.push({ studentId, point: parseFloat(point) });
                }
            });

        // Save grades to the database using GradeDetail model
        const savedGrades = await Promise.all(
            gradesData.map(async ({ studentId, point }) => {
                const user = await User.findOne({ IDStudent: studentId });
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: `User with ID ${studentId} not found`
                    });
                }

                const gradeDetail = new GradeDetail({
                    classroomId: classroom._id,
                    studentId: user._id,
                    gradeId,
                    point,
                    hasReviewed: false,
                });

                return gradeDetail.save();
            })
        );

        res.status(200).json({ message: 'Grades uploaded successfully', data: savedGrades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const getAllClassroomGrades = async (req, res) => {
    try {
        const { slug } = req.params;

        const classroom = await Classroom.findOne({ slug }).populate('gradeStructure');

        if (!classroom) {
            return res.status(404).json({ message: 'Classroom not found' });
        }

        // Lấy tất cả điểm của lớp học
        //const allGrades = await GradeDetail.find({ classroomId: classroom._id }).populate('gradeId');

        const studentGrades = await GradeDetail.find({
            classroomId: classroom._id,
        });
        const formattedGrades = await Promise.all(
            studentGrades
                .filter(gradeDetail => gradeDetail.gradeId !== null)
                .map(async gradeDetail => {
                    const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                    if (gradeInfo !== null) {
                        const { _id, title, grade, isFinalized } = gradeInfo;
                        return {
                            idGradeStructure: _id,
                            columnName: title,
                            percentage: grade,
                            isFinalized: isFinalized,
                            idStudent: gradeDetail.studentId,
                            point: gradeDetail.point,
                        };
                    }

                    return null;
                })
        );


        res.status(200).json({ success: true, data: formattedGrades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




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

const GetGradeAStudent = async (req, res) => {

    try {
        const userId = req.user._id;
        const { slugClass } = req.params;

        // Find the classroom based on slugClass
        const classroom = await Classroom.findOne({ slug: slugClass });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        const studentGrades = await GradeDetail.find({
            classroomId: classroom._id,
            studentId: userId,
        });

        if (!studentGrades || studentGrades.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No finalized grades found for the student'
            });
        }

        const formattedGrades = await Promise.all(
            studentGrades
                .filter(gradeDetail => gradeDetail.gradeId !== null)
                .map(async gradeDetail => {
                    const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                    if (gradeInfo !== null) {
                        const { _id, title, grade, isFinalized } = gradeInfo;
                        if (isFinalized) {
                            return {
                                _id: _id,
                                columnName: title,
                                percentage: grade,
                                isFinalized: isFinalized,
                                numericalGrade: gradeDetail.point,
                            };
                        }
                    }

                    return null;
                })
        );

        const finalFormattedGrades = formattedGrades.filter(Boolean);

        res.status(200).json({
            success: true,
            data: finalFormattedGrades
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}


module.exports = {
    DownloadStudentWithIdAndName,
    DownloadStudentWithId,
    UploadGradeAGradeStructure,
    GetGradeAStudent,
    getAllClassroomGrades
};
