const Classroom = require("../model/class");
const User_class = require("../model/user_class");
const User = require("../model/user");
const generateRandom = require("../helpers/generateRandom");
const generateSlug = require("../helpers/generateSlug");

const createNewClass = async (req, res) => {

    //req.body (title, subTitle)

    const userId = req.user._id;

    try {
        const classroomWithInvitationCodes = await Classroom.find(
            {},
            'invitationCode'
        );
        const existedInvitationCodes = classroomWithInvitationCodes.map(
            (classroom) => classroom.invitationCode
        );
        let invitationCode = '';
        do {
            invitationCode = generateRandom.generateRandom(8);
        } while (existedInvitationCodes.includes(invitationCode));

        let slug = generateSlug.generateSlug(req.body.title);

        const preCreateClassroom = {
            ...req.body,
            owner: userId,
            invitationCode,
            slug,
            teacherList: [userId]
        };

        const classroom = new Classroom(preCreateClassroom);
        await classroom.save();

        const preUserClassroom = {
            userID: userId,
            classID: classroom._id.toString(),
            Role: "teacher"
        }

        const userclassroom = new User_class(preUserClassroom);
        await userclassroom.save();

        res.status(201).send(classroom);
    } catch (error) {
        res.status(400).send({
            message: error.message,
        });
    }
};

const joinClassByCode = async (req, res) => {
    try {
        const userId = req.user._id;
        const { invitationId } = req.params;

        const classDetails = await Classroom.findOne({ invitationCode: invitationId });

        if (!classDetails) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check if the user is already part of the class
        const existingUserClassroom = await User_class.findOne({
            userID: userId,
            classID: classDetails._id,
        });

        if (existingUserClassroom) {
            return res.status(400).json({
                success: false,
                message: 'User is already part of the class'
            });
        }

        // Add the user to the class
        const userClassroom = new User_class({
            userID: userId,
            classID: classDetails._id,
            Role: 'student',
        });

        await userClassroom.save();

        // Update the studentList in the Classroom model
        await Classroom.findByIdAndUpdate(
            classDetails._id,
            { $push: { studentList: userId } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'User joined the class successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }


};

const joinClassByLink = async (req, res) => {
    try {
        const userId = req.user._id;
        const { slugClass } = req.params;

        const classDetails = await Classroom.findOne({ slug: slugClass });


        if (!classDetails) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Check if the user is already part of the class
        const existingUserClassroom = await User_class.findOne({
            userID: userId,
            classID: classDetails._id,
        });

        if (existingUserClassroom) {
            return res.status(400).json({
                success: false,
                message: 'User is already part of the class'
            });
        }

        // Add the user to the class
        const userClassroom = new User_class({
            userID: userId,
            classID: classDetails._id,
            Role: 'student',
        });

        await userClassroom.save();

        // Update the studentList in the Classroom model
        await Classroom.findByIdAndUpdate(
            classDetails._id,
            { $push: { studentList: userId } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: `User joined class ${classDetails.title} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

const getListClassRoleTeacher = async (req, res) => {
    try {

        const userId = req.user._id;

        const userClasses = await User_class.find({
            userID: userId,
            Role: 'teacher',
        }).populate('classID');

        const classes = userClasses.map((userClassroom) => {
            return {
                _id: userClassroom.classID._id,
                title: userClassroom.classID.title,
                subTitle: userClassroom.classID.subTitle,
                role: userClassroom.Role,
            };
        });

        res.status(200).json({ classes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getListUserOfClass = async (req, res) => {
    try {
        const { slugClass } = req.params;

        // Find the class based on the slug
        const classDetails = await Classroom.findOne({ slug: slugClass });

        if (!classDetails) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Get the list of user IDs and roles in the class
        const userClassList = await User_class.find({ classID: classDetails._id });

        // Prepare the response data with user details
        const userList = await Promise.all(userClassList.map(async userClass => {
            const user = await User.findById(userClass.userID);

            return {
                id: userClass.userID,
                role: userClass.Role,
                fullname: user.fullname,
                avatar: user.avatar
            };
        }));

        res.status(200).json({
            success: true,
            message: 'User list retrieved successfully',
            data: userList
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};


const getListClassRoleStudent = async (req, res) => {
    try {
        const userId = req.user._id;

        const userClasses = await User_class.find({
            userID: userId,
            Role: 'student'
        }).populate('classID');

        const classes = userClasses.map((userClassroom) => {
            return {
                _id: userClassroom.classID._id,
                title: userClassroom.classID.title,
                subTitle: userClassroom.classID.subTitle,
                role: userClassroom.Role,
            };
        });

        res.status(200).json({ classes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



module.exports = {
    createNewClass,
    getListClassRoleTeacher,
    getListClassRoleStudent,
    joinClassByCode,
    joinClassByLink,
    getListUserOfClass
}