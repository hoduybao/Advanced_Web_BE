const crypto = require("crypto");
require("dotenv").config();
const Classroom = require("../model/class");
const User_class = require("../model/user_class");
const Notification = require("../model/notification");
const User = require("../model/user");
const Pending_Invite = require("../model/pending_invite");
const generateRandom = require("../helpers/generateRandom");
const generateSlug = require("../helpers/generateSlug");
const sendmail = require("../helpers/sendmail");
const GradeDetail = require("../model/grade_detail");

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ email: { $ne: 'admin' } });
        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const getDetailUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const toggleAccountStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

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

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

const UpdateUsersDetails = async (req, res) => {
    try {
        const usersData = req.body; // Đầu vào là mảng dữ liệu người dùng cần cập nhật

        // Tạo một mảng chứa kết quả sau khi cập nhật cho từng người dùng
        const updatedUsers = [];

        // Duyệt qua từng người dùng trong mảng
        for (const userData of usersData) {
            const { userId, studentId } = userData;

            // Tìm người dùng dựa trên userId
            const user = await User.findById(userId);

            if (user) {
                // Cập nhật thông tin người dùng nếu có
                if (studentId !== undefined) {
                    user.IDStudent = studentId;
                }

                // Lưu lại người dùng đã được cập nhật
                const updatedUser = await user.save();
                updatedUsers.push(updatedUser);
            }
        }

        const users = await User.find({ email: { $ne: 'admin' } });

        res.status(200).json({
            success: true,
            message: 'Users details updated successfully',
            data: users,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};


const getAllClasses = async (req, res) => {
    try {
        const classes = await Classroom.find();
        res.status(200).json({
            success: true,
            data: classes,
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
    getAllUsers,
    getDetailUser,
    toggleAccountStatus,
    UpdateUsersDetails,
    getAllClasses
}