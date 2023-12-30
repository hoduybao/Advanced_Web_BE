const crypto = require("crypto");
require("dotenv").config();
const Classroom = require("../model/class");
const json2csv = require('json2csv');
const User = require("../model/user");
const GradeDetail = require("../model/grade_detail");
const csvParser = require('csv-parser');


const handleCsvUpload = async (slug, csvBuffer) => {
    try {
        const csvData = csvBuffer.toString('utf-8');
        const rows = [];

        await new Promise((resolve, reject) => {
            require('stream')
                .Readable.from(csvData)
                .pipe(csvParser())
                .on('data', (row) => {
                    // Lấy giá trị từ cột theo vị trí
                    const studentId = row[0];
                    const name = row[1];

                    rows.push({ studentId, name });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        const updatedStudentList = [];

        for (const row of rows) {
            const studentId = row.studentId;
            const name = row.name;

            let student = await User.findOne({ IDStudent: studentId });

            if (!student) {
                student = new User({
                    IDStudent: studentId,
                    fullname: name,
                });
                await student.save();
            }

            updatedStudentList.push(student._id);
        }

        const classroom = await Classroom.findOne({ slug });
        //   classroom.studentList = updatedStudentList;
        //   await classroom.save();

        const gradeStructure = classroom.gradeStructure;
        const studentList = classroom.studentList;

        const result = studentList.map(student => {
            return {
                dataStudent: {
                    _id: student._id,
                    IDStudent: student.IDStudent,
                    fullname: student.fullname,
                },
                grades: gradeStructure.map(grade => {
                    return {
                        idGradeStructure: grade._id,
                        columnName: grade.title,
                        percentage: grade.grade,
                        isFinalized: false,
                        point: null,
                    };
                }),
            };
        });

        return {
            success: true,
            data: {
                gradeStructure: gradeStructure,
                studentGrades: result,
            },
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: 'Internal Server Error',
        };
    }
};


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
        const cls = await Classroom.findOne({ slug }).populate('studentList gradeStructure');
        const grades = await GradeDetail.find({ classroomId: cls._id })

        if (!cls) {
            return res.status(400).json({
                success: false,
                message: 'Class not found'
            });
        }

        const studentData = cls.studentList.map(student => {
            const studentGrades = grades.filter(grade => grade.studentId.toString() === student._id.toString());
            const totalPoints = studentGrades.reduce((total, grade) => {
                const gradeStructure = getClassGradeById(grade.gradeId, cls.gradeStructure);
                return total + grade.point * gradeStructure.grade / 100
            }, 0);

            const gradeDetails = studentGrades.reduce((details, gradeDetail, index) => {
                const gradeStructure = getClassGradeById(gradeDetail.gradeId, cls.gradeStructure);
                if (gradeStructure) {
                    details[gradeStructure.title] = gradeDetail.point;
                }
                return details;
            }, {});

            const averagePercentage = Math.min(totalPoints, 10);

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

        // Update or save grades to the database using GradeDetail model
        const updatedGrades = await Promise.all(
            gradesData.map(async ({ studentId, point }) => {
                const user = await User.findOne({ IDStudent: studentId });
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: `User with ID ${studentId} not found`
                    });
                }

                // Check if the grade detail already exists
                const existingGradeDetail = await GradeDetail.findOne({
                    classroomId: classroom._id,
                    studentId: user._id,
                    gradeId,
                });

                if (existingGradeDetail) {
                    // Update the existing grade detail
                    existingGradeDetail.point = point;
                    return existingGradeDetail.save();
                } else {
                    // Create a new grade detail
                    const gradeDetail = new GradeDetail({
                        classroomId: classroom._id,
                        studentId: user._id,
                        gradeId,
                        point,
                        hasReviewed: false,
                    });

                    return gradeDetail.save();
                }
            })
        );

        const newdata = await getAllPointInClass(slugClass);

        res.status(200).json({
            success: true,
            message: 'Grades uploaded successfully',
            data: newdata
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

const getAllPointInClass = async (slug) => {
    try {
        const classroom = await Classroom.findOne({ slug }).populate('gradeStructure').populate('studentList');

        if (!classroom) {
            return;
        }

        // Lấy tất cả điểm của lớp học
        const studentGrades = await GradeDetail.find({
            classroomId: classroom._id,
        }).populate({
            path: 'studentId',
            model: 'User',
            select: 'IDStudent fullname', // Chọn các trường cần thiết từ bảng User
        });

        // Tạo một đối tượng Map để gom nhóm theo sinh viên
        const groupedGrades = new Map();

        // Duyệt qua mảng studentGrades và gom nhóm theo sinh viên
        studentGrades.forEach(gradeDetail => {
            if (gradeDetail.gradeId !== null) {
                const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                if (gradeInfo !== null) {
                    const { _id, title, grade, isFinalized } = gradeInfo;
                    const { studentId, IDStudent, fullname } = gradeDetail;

                    if (!groupedGrades.has(studentId)) {
                        groupedGrades.set(studentId, {
                            dataStudent: studentId,
                            IDStudent: IDStudent,
                            fullname: fullname,
                            grades: [],
                        });
                    }

                    // Kiểm tra xem cột điểm đã tồn tại trong mảng grades của sinh viên hay chưa
                    const existingGradeIndex = groupedGrades.get(studentId).grades.findIndex(
                        grade => grade.idGradeStructure.toString() === _id.toString()
                    );

                    // Nếu đã tồn tại, cập nhật điểm; nếu chưa, thêm mới vào mảng
                    if (existingGradeIndex !== -1) {
                        groupedGrades.get(studentId).grades[existingGradeIndex].point = gradeDetail.point !== null ? gradeDetail.point : null;
                    } else {
                        groupedGrades.get(studentId).grades.push({
                            idGradeStructure: _id,
                            columnName: title,
                            percentage: grade,
                            isFinalized: isFinalized,
                            point: gradeDetail.point !== null ? gradeDetail.point : null,
                        });
                    }
                }
            }
        });

        // Thêm các cột điểm chưa có điểm vào mảng grades với point = null
        classroom.gradeStructure.forEach(grade => {
            const gradeId = grade._id.toString();
            if (groupedGrades.size != 0) {
                groupedGrades.forEach(student => {
                    // Kiểm tra xem cột điểm đã tồn tại trong mảng grades của sinh viên hay chưa
                    const existingGradeIndex = student.grades.findIndex(gradeDetail => gradeDetail.idGradeStructure.toString() === gradeId);

                    if (existingGradeIndex === -1) {
                        student.grades.push({
                            idGradeStructure: gradeId,
                            columnName: grade.title,
                            percentage: grade.grade,
                            isFinalized: false,
                            point: null,
                        });
                    }
                });
            } else {
                // Thêm sinh viên chưa có điểm vào danh sách kết quả với điểm là null
                classroom.studentList.forEach(student => {
                    const studentId = student._id.toString();
                    if (!groupedGrades.has(studentId)) {
                        groupedGrades.set(studentId, {
                            dataStudent: {
                                _id: studentId,
                                IDStudent: student.IDStudent,
                                fullname: student.fullname,
                            },
                            grades: classroom.gradeStructure.map(grade => ({
                                idGradeStructure: grade._id,
                                columnName: grade.title,
                                percentage: grade.grade,
                                isFinalized: false,
                                point: null,
                            })),
                        });
                    }
                });
            }

        });



        // Tính điểm trung bình và cập nhật vào kết quả trả về
        const result = Array.from(groupedGrades.values()).map(item => {
            const totalPoints = item.grades.reduce((total, grade) => total + (grade.point !== null ? grade.point : 0) * (grade.percentage / 100), 0);

            const averagePoint = parseFloat(totalPoints.toFixed(2));

            const cappedAveragePoint = Math.min(averagePoint, 10);

            return {
                dataStudent: item.dataStudent,
                IDStudent: item.IDStudent,
                fullname: item.fullname,
                grades: item.grades,
                averagePoint: cappedAveragePoint,
            };
        });

        return {
            gradeStructure: classroom.gradeStructure,
            studentGrades: result,
        };

    } catch (error) {
        console.error(error);
        return;
    }
}

const getAllClassroomGrades = async (req, res) => {
    try {
        const { slug } = req.params;

        const classroom = await Classroom.findOne({ slug }).populate('gradeStructure').populate('studentList');

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

        // Tạo một đối tượng Map để gom nhóm theo sinh viên
        const groupedGrades = new Map();

        // Duyệt qua mảng studentGrades và gom nhóm theo sinh viên
        studentGrades.forEach(gradeDetail => {
            if (gradeDetail.gradeId !== null) {
                const gradeInfo = getClassGradeById(gradeDetail.gradeId, classroom.gradeStructure);

                if (gradeInfo !== null) {
                    const { _id, title, grade, isFinalized } = gradeInfo;
                    const { studentId, IDStudent, fullname } = gradeDetail;

                    if (!groupedGrades.has(studentId)) {
                        groupedGrades.set(studentId, {
                            dataStudent: studentId,
                            IDStudent: IDStudent,
                            fullname: fullname,
                            grades: [],
                        });
                    }

                    // Kiểm tra xem cột điểm đã tồn tại trong mảng grades của sinh viên hay chưa
                    const existingGradeIndex = groupedGrades.get(studentId).grades.findIndex(
                        grade => grade.idGradeStructure.toString() === _id.toString()
                    );

                    // Nếu đã tồn tại, cập nhật điểm; nếu chưa, thêm mới vào mảng
                    if (existingGradeIndex !== -1) {
                        groupedGrades.get(studentId).grades[existingGradeIndex].point = gradeDetail.point !== null ? gradeDetail.point : null;
                    } else {
                        groupedGrades.get(studentId).grades.push({
                            idGradeStructure: _id,
                            columnName: title,
                            percentage: grade,
                            isFinalized: isFinalized,
                            point: gradeDetail.point !== null ? gradeDetail.point : null,
                        });
                    }
                }
            }
        });

        // Thêm các cột điểm chưa có điểm vào mảng grades với point = null
        classroom.gradeStructure.forEach(grade => {
            const gradeId = grade._id.toString();
            if (groupedGrades.size != 0) {
                groupedGrades.forEach(student => {
                    // Kiểm tra xem cột điểm đã tồn tại trong mảng grades của sinh viên hay chưa
                    const existingGradeIndex = student.grades.findIndex(gradeDetail => gradeDetail.idGradeStructure.toString() === gradeId);

                    if (existingGradeIndex === -1) {
                        student.grades.push({
                            idGradeStructure: gradeId,
                            columnName: grade.title,
                            percentage: grade.grade,
                            isFinalized: false,
                            point: null,
                        });
                    }
                });
            } else {
                // Thêm sinh viên chưa có điểm vào danh sách kết quả với điểm là null
                classroom.studentList.forEach(student => {
                    const studentId = student._id.toString();
                    if (!groupedGrades.has(studentId)) {
                        groupedGrades.set(studentId, {
                            dataStudent: {
                                _id: studentId,
                                IDStudent: student.IDStudent,
                                fullname: student.fullname,
                            },
                            grades: classroom.gradeStructure.map(grade => ({
                                idGradeStructure: grade._id,
                                columnName: grade.title,
                                percentage: grade.grade,
                                isFinalized: false,
                                point: null,
                            })),
                        });
                    }
                });
            }

        });



        // Tính điểm trung bình và cập nhật vào kết quả trả về
        const result = Array.from(groupedGrades.values()).map(item => {
            const totalPoints = item.grades.reduce((total, grade) => total + (grade.point !== null ? grade.point : 0) * (grade.percentage / 100), 0);

            const averagePoint = parseFloat(totalPoints.toFixed(2));

            const cappedAveragePoint = Math.min(averagePoint, 10);

            return {
                dataStudent: item.dataStudent,
                IDStudent: item.IDStudent,
                fullname: item.fullname,
                grades: item.grades,
                averagePoint: cappedAveragePoint,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                gradeStructure: classroom.gradeStructure,
                studentGrades: result,
            },
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
            const { idStudent, grades: studentGrades } = gradeData;

            // Kiểm tra xem sinh viên có trong lớp học không
            const isStudentInClass = classroom.studentList.includes(idStudent);

            if (!isStudentInClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Student not found in the class'
                });
            }

            // Duyệt qua điểm của sinh viên
            for (const studentGrade of studentGrades) {
                const { idGradeStructure, point } = studentGrade;

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

        const totalPoints = studentGrades.reduce((total, grade) => {
            const gradeStructure = getClassGradeById(grade.gradeId, classroom.gradeStructure);
            if (gradeStructure && gradeStructure.isFinalized) {
                return total + (grade.point || 0) * (gradeStructure.grade / 100);
            } else {
                return total;
            }
        }, 0);

        const formattedGrades = await Promise.all(
            classroom.gradeStructure.map(async gradeStructure => {
                const gradeDetail = studentGrades.find(grade => grade.gradeId.toString() === gradeStructure._id.toString());

                if (gradeDetail) {
                    return {
                        _id: gradeStructure._id,
                        columnName: gradeStructure.title,
                        percentage: gradeStructure.grade,
                        isFinalized: gradeStructure.isFinalized,
                        point: gradeDetail.point,
                    };
                } else {
                    return {
                        _id: gradeStructure._id,
                        columnName: gradeStructure.title,
                        percentage: gradeStructure.grade,
                        isFinalized: gradeStructure.isFinalized,
                        point: null,
                    };
                }
            })
        );

        // Get student information
        const studentInfo = await User.findById(userId, 'fullname IDStudent');

        res.status(200).json({
            success: true,
            data: {
                gradeStructure: classroom.gradeStructure,
                studentGrades: [
                    {
                        dataStudent: studentInfo,
                        grades: formattedGrades,
                        averagePoint: totalPoints
                    }
                ],
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};





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