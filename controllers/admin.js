const crypto = require("crypto");
require("dotenv").config();
const Classroom = require("../model/class");
const json2csv = require('json2csv');
const User = require("../model/user");

const checkIsAdmin = async (_id) => {
    try {
        const users = await User.findOne({ email: 'admin' });
        if (users._id.toString() === _id) return true;
        return false;
    } catch (error) {
        console.error(error);
        return false;
    }
}

const getAllUsers = async (req, res) => {
    try {
        const { pageSize, pageNumber } = req.query;

        const totalUsers = await User.countDocuments({ email: { $ne: 'admin' } });
        const totalPages = Math.ceil(totalUsers / pageSize);

        const users = await User.find({ email: { $ne: 'admin' } })
            .skip((pageNumber - 1) * pageSize)
            .limit(parseInt(pageSize));

        // Kiểm tra và điều chỉnh dữ liệu trả về
        const adjustedUsers = users.map(user => ({
            ...user.toObject(),
            IDStudent: user.IDStudent || null,
        }));

        if (await checkIsAdmin(req.user._id)) {
            res.status(200).json({
                success: true,
                data: adjustedUsers,
                data: {
                    totalPages,
                    currentPage: Number(pageNumber),
                    Userdata: adjustedUsers

                },
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};





const getDetailUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (await checkIsAdmin(req.user._id)) {
            res.status(200).json({
                success: true,
                data: user,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const toggleAccountStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (await checkIsAdmin(req.user._id)) {
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            user.isLocked = !user.isLocked;
            await user.save();

            res.status(200).json({
                success: true,
                message: `Account ${user.email} is ${user.isLocked ? 'locked' : 'unlocked'}`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }


    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const UpdateUsersDetails = async (req, res) => {
    try {
        const userData = req.body; // Đầu vào là đối tượng người dùng cần cập nhật

        const { userId, studentId } = userData;

        const user = await User.findById(userId);

        if (user) {
            // Cập nhật thông tin người dùng nếu có
            if (studentId !== undefined) {
                user.IDStudent = studentId;
            }

            // Lưu lại người dùng đã được cập nhật
            const updatedUser = await user.save();

            res.status(200).json({
                success: true,
                message: 'User details updated successfully',
                data: updatedUser,
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'User not found',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const getAllClasses = async (req, res) => {
    try {
        const { active, pageSize, pageNumber } = req.query;

        let query = {};

        if (active !== undefined) {
            query.isActived = active === 'true';
        }

        const totalClasses = await Classroom.countDocuments(query);
        const totalPages = Math.ceil(totalClasses / pageSize);
        const classes = await Classroom.find(query)
            .skip((pageNumber - 1) * pageSize)
            .limit(Number(pageSize));

        if (await checkIsAdmin(req.user._id)) {
            res.status(200).json({
                success: true,
                data: {
                    totalPages,
                    currentPage: Number(pageNumber),
                    classes
                },
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const getDetailClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const classes = await Classroom.findById(classId);
        if (await checkIsAdmin(req.user._id)) {
            res.status(200).json({
                success: true,
                data: classes,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const toggleClassStatus = async (req, res) => {
    try {
        const { classId } = req.params;
        const classes = await Classroom.findById(classId);
        if (await checkIsAdmin(req.user._id)) {
            if (!classes) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            classes.isActived = !classes.isActived;
            await classes.save();

            res.status(200).json({
                success: true,
                message: `Class ${classes.title} is ${classes.isActived ? 'actived' : 'inactived'}`,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Access denied. You do not have permission to perform this action.',
            });
        }


    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const DownloadCsvDataUserWithEmail = async (req, res) => {
    try {
        // Lấy dữ liệu người dùng từ database
        const users = await User.find({ email: { $ne: 'admin' } });

        // Chuyển đổi dữ liệu thành định dạng cho json2csv
        const userData = users.map(user => ({
            Email: user.email.replace(/\r$/, '')
        }));

        // Tạo trường và chuỗi CSV
        const fields = ['Email'];
        const csv = json2csv.parse(userData, { fields });

        // Thiết lập header và gửi tệp CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-list.csv');
        res.status(200).send(csv);
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

const uploadCsvFileToMapStudentID = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const usersData = [];
        req.file.buffer
            .toString()
            .replace(/\r/g, '')
            .split('\n')
            .forEach(row => {
                const [email, studentId] = row.split(',');
                if (email && studentId) {
                    usersData.push({ email, studentId });
                }
            });

        // Update or save STUDENTID to the database using User model
        const updatedUsers = await Promise.all(
            usersData.map(async ({ email, studentId }) => {
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(400).json({
                        success: false,
                        message: `User with email ${email} not found`
                    });
                }

                // Update the existing user
                user.IDStudent = studentId;
                return user.save();
            })
        );

        const newdata = await User.find({ email: { $ne: 'admin' } });

        res.status(200).json({
            success: true,
            message: 'StudentId updated successfully',
            data: newdata
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}

module.exports = {
    getAllUsers,
    getDetailUser,
    toggleAccountStatus,
    UpdateUsersDetails,
    getAllClasses,
    getDetailClass,
    toggleClassStatus,
    DownloadCsvDataUserWithEmail,
    uploadCsvFileToMapStudentID
}