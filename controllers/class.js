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


const getAllInfo = async (req, res) => {
  try {

    const { slugClass } = req.params;

    const classInfo = await Classroom.findOne({ slug: slugClass })
      .populate({
        path: "studentList",
        select: "id fullname avatar",
      })
      .populate({
        path: "teacherList",
        select: "id fullname avatar",
      })
      .populate({
        path: "owner",
        select: "id fullname avatar",
      });

    if (!classInfo) {
      return res.status(400).json({
        success: false,
        message: "Class not found",
      });
    }
    if (!classInfo.isActived) {
      return res.status(400).json({
        success: false,
        message: "Class is not actived. Please contact to admin!",
      });
    }

    res.status(200).json({
      success: true,
      data: classInfo,
    });
  } catch (error) {
    console.error(error);
    res.status(4000).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}
const createNewClass = async (req, res) => {
  //req.body (title, subTitle)

  const userId = req.user._id;

  try {
    const classroomWithInvitationCodes = await Classroom.find(
      {},
      "invitationCode"
    );
    const existedInvitationCodes = classroomWithInvitationCodes.map(
      (classroom) => classroom.invitationCode
    );
    let invitationCode = "";
    do {
      invitationCode = generateRandom.generateRandom(8);
    } while (existedInvitationCodes.includes(invitationCode));

    let slug = generateSlug.generateSlug(req.body.title);

    const preCreateClassroom = {
      ...req.body,
      owner: userId,
      invitationCode,
      slug,
      teacherList: [userId],
    };

    const classroom = new Classroom(preCreateClassroom);
    await classroom.save();

    const preUserClassroom = {
      userID: userId,
      classID: classroom._id.toString(),
      Role: "teacher",
    };

    const userclassroom = new User_class(preUserClassroom);
    await userclassroom.save();

    res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    res.status(200).send({
      success: false,
      message: error.message,
    });
  }
};

const joinClassByCode = async (req, res) => {
  try {
    const userId = req.user._id;
    const { invitationId } = req.params;

    const classDetails = await Classroom.findOne({
      invitationCode: invitationId,
    });

    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if the user is already part of the class
    const existingUserClassroom = await User_class.findOne({
      userID: userId,
      classID: classDetails._id,
    });

    if (existingUserClassroom) {
      return res.status(200).json({
        success: true,
        message: "User is already part of the class",
        data: classDetails
      });
    }

    // Add the user to the class
    const userClassroom = new User_class({
      userID: userId,
      classID: classDetails._id,
      Role: "student",
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
      data: classDetails,
      message: "User joined the class successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const checkUserInClass = async (req, res) => {
  try {
    const userId = req.user._id;
    const { slugClass } = req.params;

    const classDetails = await Classroom.findOne({ slug: slugClass });

    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if the user is already part of the class
    const existingUserClassroom = await User_class.findOne({
      userID: userId,
      classID: classDetails._id,
    });

    if (existingUserClassroom) {
      return res.status(200).json({
        success: true,
        message: "User is already join in the class",
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "User is not join in the class",
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const inviteUserByMail = async (req, res) => {
  const { email, role, slug } = req.body;


  const classDetails = await Classroom.findOne({ slug: slug });

  if (!classDetails) {
    return res.status(404).json({
      success: false,
      message: "Class not found",
    });
  }

  const user = await User.findOne({ email: email });

  const emailhash = crypto.randomBytes(64).toString("hex");

  const new_pending_invite = new Pending_Invite({
    email: email,
    classID: classDetails._id,
    role: role,
    isValid: true,
    emailToken: emailhash,
  });

  if (user) {
    const userClass = await User_class.findOne({
      userID: user._id,
      classID: classDetails._id,
    });

    if (userClass) {
      return res.status(200).json({
        success: false,
        message: "User is exist in class!",
      });
    } else {
      sendmail.sendmail(
        email,
        "Invite to Classroom",
        `<h2>You have just received an invitation to join the class: ${classDetails.title} as a ${role}</h2>
            <h4>To participate, please <a href="http://${req.headers.host}/api/class/verify-invite?slug=${classDetails.slug}&role=${role}&token=${emailhash}">click here</a></h4>        
            `
      );
      new_pending_invite.save();
      return res.status(200).json({
        success: true,
        message: "Invitation has been sent successfully!",
      });
    }
  } else {
    sendmail.sendmail(
      email,
      "Invite to Classroom",
      `<h2>You have just received an invitation to join the class: ${classDetails.title} as a ${role}</h2>
            <h4>To participate, please <a href="http://${req.headers.host}/api/class/verify-invite?slug=${classDetails.slug}&role=${role}&token=${emailhash}">click here</a></h4>        
            `
    );
    new_pending_invite.save();
    return res.status(200).json({
      success: true,
      message: "Invitation has been sent successfully!",
    });
  }
};

const verifyInvite = async (req, res) => {
  const { slug, role, token } = req.query;

  const pending_invite = await Pending_Invite.findOne({ emailToken: token });

  const user = await User.findOne({ email: pending_invite.email });

  if (!pending_invite.isValid) {
    return res.status(400).send(`
        <html>
            <head>
                <title>Failed to join the class</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .content {
                        text-align: center;
                        border: 2px solid #ccc;
                        padding: 20px;
                        border-radius: 10px;
                    }
                    h1 {
                        color: red;
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    <h1>Failed to join the class</h1>
                    <p>You are already in the class.</p>
                </div>
            </body>
        </html>`);
  }

  if (user) {
    const classDetails = await Classroom.findOne({ slug: slug });
    const new_user_class = new User_class({
      userID: user._id,
      classID: classDetails._id,
      Role: role,
    });

    if (role == "student") {
      await Classroom.findByIdAndUpdate(
        classDetails._id,
        { $push: { studentList: user._id } },
        { new: true }
      );
    } else {
      await Classroom.findByIdAndUpdate(
        classDetails._id,
        { $push: { teacherList: user._id } },
        { new: true }
      );
    }

    new_user_class.save();

    await Pending_Invite.findByIdAndUpdate(
      pending_invite._id,
      { isValid: false },
      { new: true }
    );

    return res.status(200).send(`
        <html>
            <head>
                <title>Join Class Successfully</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .content {
                        text-align: center;
                        border: 2px solid #ccc;
                        padding: 20px;
                        border-radius: 10px;
                    }
                    h1 {
                        color: green;
                    }
                    button {
                        padding: 10px 20px;
                        background-color: #4caf50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    <h1>Join Class Successfully</h1>
                    <p>You have been approved to join the class, you can start right away.</p>
                    <button id="startButton">Start Class</button>
                </div>
                <script>
                    document.getElementById("startButton").addEventListener("click", function () {
                        window.location.href = "${process.env.CLIENT_URL}/class/${slug}";
                    });
                </script>
            </body>
        </html>`);
  } else {
    return res.status(400).send(`
        <html>
            <head>
                <title>Failed to join the class</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .content {
                        text-align: center;
                        border: 2px solid #ccc;
                        padding: 20px;
                        border-radius: 10px;
                    }
                    h1 {
                        color: red;
                    }
                    button {
                        padding: 10px 20px;
                        background-color: #4caf50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    <h1>Failed to join the class</h1>
                    <p>You don't have a classroom account yet. Please create an account here.</p>
                    <button id="startButton">Register</button>
                </div>
                <script>
                    document.getElementById("startButton").addEventListener("click", function () {
                        window.location.href = "${process.env.CLIENT_URL}/auth/register";
                    });
                </script>
            </body>
        </html>`);
  }
};

const joinClassByLink = async (req, res) => {
  try {
    const userId = req.user._id;
    const { slugClass } = req.params;

    const { code } = req.query;

    const classDetails = await Classroom.findOne({ slug: slugClass, invitationCode: code });

    if (!classDetails) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if the user is already part of the class
    const existingUserClassroom = await User_class.findOne({
      userID: userId,
      classID: classDetails._id,
    });

    if (existingUserClassroom) {
      return res.status(200).json({
        success: false,
        message: "User is already part of the class",
      });
    }

    // Add the user to the class
    const userClassroom = new User_class({
      userID: userId,
      classID: classDetails._id,
      Role: "student",
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
      message: `User joined class successfully`,
      data: classDetails
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Internal Server Error",
    });
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
        message: "Class not found",
      });
    }

    // Get the list of user IDs and roles in the class
    const userClassList = await User_class.find({ classID: classDetails._id });

    // Prepare the response data with user details
    const userList = await Promise.all(
      userClassList.map(async (userClass) => {
        const user = await User.findById(userClass.userID);

        return {
          id: userClass.userID,
          role: userClass.Role,
          fullname: user.fullname,
          avatar: user.avatar,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "User list retrieved successfully",
      data: userList,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getListClassOfUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const userClasses = await User_class.find({
      userID: userId,
    }).populate({
      path: "classID",
      populate: {
        path: "owner",
        model: "User",
      },
    });

    const classes = userClasses.map((userClassroom) => {
      return {
        _id: userClassroom.classID._id,
        slug: userClassroom.classID.slug,
        title: userClassroom.classID.title,
        subTitle: userClassroom.classID.subTitle,
        role: userClassroom.Role,
        owner: {
          name: userClassroom.classID.owner.fullname,
          avatar: userClassroom.classID.owner.avatar,
        },
        isActived: userClassroom.classID.isActived
      };
    });

    res.status(200).json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

const createOrUpdateGradeStructure = async (req, res) => {
  try {
    const { slug } = req.params;
    const gradeStructures = req.body;

    if (!gradeStructures || gradeStructures.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Require body grade structure",
      });
    } else {
      const classDetails = await Classroom.findOne({ slug: slug });

      // Fetch the existing grade structure
      const existingGradeStructure = classDetails.gradeStructure || [];

      // Identify the grade structures to be removed
      const removedGradeIds = existingGradeStructure
        .filter(grade => !gradeStructures.some(newGrade => newGrade._id && newGrade._id.toString() === grade._id.toString()))
        .map(grade => grade._id.toString());


      const validGradeStructures = gradeStructures.filter(item => item._id !== "");

      const updatedClass = await Classroom.findOneAndUpdate(
        { _id: classDetails._id },
        {
          $set: {
            gradeStructure: validGradeStructures,
          },
        },
        { new: true }
      );

      await updatedClass.save();

      const classDetailReturn = await Classroom.findOne({ slug: slug });

      // Add new grades
      const newGrades = gradeStructures.filter(newGrade => !newGrade._id || !existingGradeStructure.some(existingGrade => existingGrade._id.toString() === newGrade._id.toString()));
      classDetailReturn.gradeStructure.push(...newGrades);

      const updated = await Classroom.findOneAndUpdate(
        { _id: classDetailReturn._id },
        {
          $set: {
            gradeStructure: classDetailReturn.gradeStructure,
          },
        },
        { new: true }
      );

      // Remove corresponding GradeDetail records for removed grade structures
      await GradeDetail.deleteMany({
        classroomId: classDetails._id,
        gradeId: { $in: removedGradeIds },
      });

      return res.status(200).json({
        success: true,
        message: "Create or Update Grade Structure Successfully",
        data: updated,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: "Server error",
    });
  }
};




const FinalizedGradeStructure = async (req, res) => {
  try {
    const { slugClass, gradeID } = req.params;

    const classroom = await Classroom.findOne({ slug: slugClass });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    const composition = classroom.gradeStructure.find(comp => comp._id.toString() === gradeID);

    if (!composition) {
      return res.status(400).json({
        success: false,
        message: 'Grade composition not found'
      });
    }

    composition.isFinalized = true;

    await classroom.save();

    // Get all students in the classroom
    const students = await User.find({ _id: { $in: classroom.studentList } });

    // Create a notification for each student
    const notifications = students.map(student => {
      return new Notification({
        senderId: req.user._id,  // ID của người thực hiện thao tác (giáo viên)
        receiverId: student._id,
        objectId: composition._id,
        objectName: 'Grade Composition',
        message: `The grade composition for ${composition.title} in class ${classroom.title} has been finalized.`,
        url: `/class/${classroom.slug}?tab=3`  // Điều hướng URL tới trang phù hợp
      });
    });

    // Save all notifications
    await Notification.insertMany(notifications);

    const io = req.app.get("io");
    io.emit("newNotify", {
      success: true,
      message: `New Notify`,
    });

    res.status(200).json({
      success: true,
      message: 'Grade composition marked as finalized'
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};




module.exports = {
  createNewClass,
  getListClassOfUser,
  joinClassByCode,
  joinClassByLink,
  getListUserOfClass,
  checkUserInClass,
  inviteUserByMail,
  verifyInvite,
  getAllInfo,
  createOrUpdateGradeStructure,
  FinalizedGradeStructure
};
