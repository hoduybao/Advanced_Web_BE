const nodemailer = require("nodemailer");
require("dotenv").config();

const sendmail = (receiverEmail, subject, html) => {
    var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.AUTH_EMAIL,
            pass: process.env.AUTH_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    var mailOptions = {
        from: `"BTH classroom"<${process.env.AUTH_EMAIL}>`,
        to: receiverEmail,
        subject: subject,
        html: html,
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        }
    });

};

module.exports = {
    sendmail
};

