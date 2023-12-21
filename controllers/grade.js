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
            return res.status(400).json({
                success: false,
                message: 'Class not found'
            });
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
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
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
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};


const ExportGradeBoard = async (req, res) => {
    try {
        const { slug } = req.params;
        const cls = await Classroom.findOne({ slug }).populate('studentList');
        const grades = await GradeDetail.find({ classroomId: cls._id });

        if (!cls) {
            return res.status(400).json({
                success: false,
                message: 'Class not found'
            });
        }

        const studentData = cls.studentList.map(student => {
            const studentGrades = grades.filter(grade => grade.studentId.toString() === student._id.toString());
            const totalPoints = studentGrades.reduce((total, grade) => total + grade.point, 0);

            const gradeDetails = studentGrades.reduce((details, gradeDetail, index) => {
                const gradeStructure = getClassGradeById(gradeDetail.gradeId, cls.gradeStructure);
                if (gradeStructure) {
                    details[gradeStructure.title] = gradeDetail.point;
                }
                return details;
            }, {});

            const averagePercentage = totalPoints / studentGrades.length;

            return {
                StudentId: student.IDStudent,
                ...gradeDetails,
                Average: averagePercentage,
            };
        });

        // Lấy tất cả các tên cột từ tất cả các chi tiết điểm
        const allColumns = studentData.reduce((columns, student) => {
            // Kiểm tra xem cột đã tồn tại trong mảng chưa
            const studentIdExists = columns.includes('StudentId');
            const averagePercentageExists = columns.includes('Average');

            return columns.concat(
                ...Object.keys(student).filter(key =>
                    (key !== 'StudentId' || !studentIdExists) &&
                    (key !== 'Average' || !averagePercentageExists)
                )
            );
        }, []);


        // Loại bỏ các cột trùng lặp và giữ lại chỉ một bản sao của mỗi tên cột
        const uniqueColumns = [...new Set(allColumns)];


        const fields = [
            ...uniqueColumns.includes('StudentId') ? [] : ['StudentId'],
            ...uniqueColumns,
            ...uniqueColumns.includes('Average') ? [] : ['Average']
        ];

        const csv = json2csv.parse(studentData, { fields, flatten: true });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=point-${cls._id}.csv`);

        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

const DownloadSingleGradeColumn = async (req, res) => {
    try {
        const { slug, idGradeStructure } = req.params;
        const cls = await Classroom.findOne({ slug }).populate('studentList');
        const grades = await GradeDetail.find({ classroomId: cls._id, 'gradeId': idGradeStructure });

        if (!cls) {
            return res.status(400).json({
                success: false,
                message: 'Class not found'
            });
        }

        const gradeStructure = cls.gradeStructure.find(structure => structure._id.toString() === idGradeStructure.toString());
        if (!gradeStructure) {
            return res.status(400).json({
                success: false,
                message: 'Grade structure not found'
            });
        }

        const studentData = cls.studentList.map(student => {
            const studentGrade = grades.find(grade => grade.studentId.toString() === student._id.toString());

            return {
                StudentId: student.IDStudent,
                Point: studentGrade ? studentGrade.point : null,
            };
        });

        const fields = ['StudentId', 'Point'];
        const csv = json2csv.parse(studentData, { fields, flatten: true });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=point-${cls._id}-${gradeStructure.title}.csv`);

        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};




const UploadGradeAGradeStructure = async (req, res) => {
    try {
        const { slugClass, gradeId } = req.params;

        const classroom = await Classroom.findOne({ slug: slugClass });
        if (!classroom) {
            return res.status(400).json({
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

const getAllPointInClass = async (slug) => {
    try {
        const classroom = await Classroom.findOne({ slug }).populate('gradeStructure');

        if (!classroom) {
            return;
        }
        const studentGrades = await GradeDetail.find({
            classroomId: classroom._id,
        }).populate({
            path: 'studentId',
            model: 'User',
            select: 'IDStudent fullname',
        });

        const groupedGrades = new Map();

        studentGrades.forEach(gradeDetail => {
            if (gradeDetail.gradeId !== null) {
                const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                if (gradeInfo !== null) {
                    const { _id, title, grade, isFinalized } = gradeInfo;
                    const { studentId, point, IDStudent, fullname } = gradeDetail;

                    if (!groupedGrades.has(_id)) {
                        groupedGrades.set(_id, {
                            idGradeStructure: _id,
                            columnName: title,
                            percentage: grade,
                            isFinalized: isFinalized,
                            students: [],
                        });
                    }

                    groupedGrades.get(_id).students.push({
                        dataStudent: studentId,
                        point: point,
                        IDStudent: IDStudent,
                        fullname: fullname,
                    });
                }
            }
        });

        // Chuyển Map thành mảng và chọn thuộc tính cần thiết
        const result = Array.from(groupedGrades.values()).map(item => ({
            idGradeStructure: item.idGradeStructure,
            columnName: item.columnName,
            percentage: item.percentage,
            isFinalized: item.isFinalized,
            students: item.students,
        }));

        return result;
    } catch (error) {
        console.error(error);
        return;
    }
}

const getAllClassroomGrades = async (req, res) => {
    try {
        const { slug } = req.params;

        const classroom = await Classroom.findOne({ slug }).populate('gradeStructure');

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Lấy tất cả điểm của lớp học
        const studentGrades = await GradeDetail.find({
            classroomId: classroom._id,
        }).populate({
            path: 'studentId',
            model: 'User',
            select: 'IDStudent fullname', // Chọn các trường cần thiết từ bảng User
        });

        // Tạo một đối tượng Map để gom nhóm theo idGradeStructure
        const groupedGrades = new Map();

        // Duyệt qua mảng studentGrades và gom nhóm theo idGradeStructure
        studentGrades.forEach(gradeDetail => {
            if (gradeDetail.gradeId !== null) {
                const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                if (gradeInfo !== null) {
                    const { _id, title, grade, isFinalized } = gradeInfo;
                    const { studentId, point, IDStudent, fullname } = gradeDetail;

                    if (!groupedGrades.has(_id)) {
                        groupedGrades.set(_id, {
                            idGradeStructure: _id,
                            columnName: title,
                            percentage: grade,
                            isFinalized: isFinalized,
                            students: [],
                        });
                    }

                    // Thêm thông tin của sinh viên và điểm vào mảng tương ứng với idGradeStructure
                    groupedGrades.get(_id).students.push({
                        dataStudent: studentId,
                        point: point,
                        IDStudent: IDStudent,
                        fullname: fullname,
                    });
                }
            }
        });

        // Chuyển Map thành mảng và chọn thuộc tính cần thiết
        const result = Array.from(groupedGrades.values()).map(item => ({
            idGradeStructure: item.idGradeStructure,
            columnName: item.columnName,
            percentage: item.percentage,
            isFinalized: item.isFinalized,
            students: item.students,
        }));

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};


const AddOrUpdateGrade = async (req, res) => {
    try {
        const { slugClass, idStudent, idGradeStructure } = req.params;
        const { point } = req.body;

        // Tìm lớp học dựa trên slugClass
        const classroom = await Classroom.findOne({ slug: slugClass });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Kiểm tra xem sinh viên có trong lớp học không
        const isStudentInClass = classroom.studentList.includes(idStudent);

        if (!isStudentInClass) {
            return res.status(400).json({
                success: false,
                message: 'Student not found in the class'
            });
        }

        // Kiểm tra xem gradestructure có trong lớp học không
        const isGradeStructureInClass = classroom.gradeStructure.some(
            grade => grade._id.toString() === idGradeStructure
        );

        if (!isGradeStructureInClass) {
            return res.status(400).json({
                success: false,
                message: 'Grade structure not found in the class'
            });
        }

        // Kiểm tra xem điểm đã tồn tại chưa
        let gradeDetail = await GradeDetail.findOne({
            classroomId: classroom._id,
            studentId: idStudent,
            gradeId: idGradeStructure,
        });

        if (!gradeDetail) {
            // Nếu chưa có điểm, tạo mới
            gradeDetail = new GradeDetail({
                classroomId: classroom._id,
                studentId: idStudent,
                gradeId: idGradeStructure,
                point: point,
            });

            await gradeDetail.save();
        } else {
            // Nếu đã có điểm, cập nhật
            gradeDetail.point = point;
            await gradeDetail.save();
        }

        res.status(200).json({
            success: true,
            message: 'Grade added/updated successfully',
            data: await getAllPointInClass(slugClass)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

const UpdateGradesFull = async (req, res) => {
    try {
        const { slugClass } = req.params;
        const { grades } = req.body;

        // Tìm lớp học dựa trên slugClass
        const classroom = await Classroom.findOne({ slug: slugClass });

        if (!classroom) {
            return res.status(400).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Duyệt qua danh sách điểm cần cập nhật
        for (const gradeData of grades) {
            const { idStudent, idGradeStructure, point } = gradeData;

            // Kiểm tra xem sinh viên có trong lớp học không
            const isStudentInClass = classroom.studentList.includes(idStudent);

            if (!isStudentInClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Student not found in the class'
                });
            }

            // Kiểm tra xem gradestructure có trong lớp học không
            const isGradeStructureInClass = classroom.gradeStructure.some(
                grade => grade._id.toString() === idGradeStructure
            );

            if (!isGradeStructureInClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Grade structure not found in the class'
                });
            }

            // Kiểm tra xem điểm đã tồn tại chưa
            let gradeDetail = await GradeDetail.findOne({
                classroomId: classroom._id,
                studentId: idStudent,
                gradeId: idGradeStructure,
            });

            if (!gradeDetail) {
                // Nếu chưa có điểm, tạo mới
                gradeDetail = new GradeDetail({
                    classroomId: classroom._id,
                    studentId: idStudent,
                    gradeId: idGradeStructure,
                    point: point,
                });

                await gradeDetail.save();
            } else {
                // Nếu đã có điểm, cập nhật
                gradeDetail.point = point;
                await gradeDetail.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Grades updated successfully',
            data: await getAllPointInClass(slugClass)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
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
    ExportGradeBoard,
    UploadGradeAGradeStructure,
    GetGradeAStudent,
    getAllClassroomGrades,
    AddOrUpdateGrade,
    UpdateGradesFull,
    DownloadSingleGradeColumn
};
