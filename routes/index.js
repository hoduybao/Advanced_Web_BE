const userRouter = require('./user');
const authRouter = require('./auth');
const classRouter = require('./class');
const gradeRouter = require('./grade');
const gradeReviewRouter = require('./grade_review');
const notificationRouter = require('./notification');
const { notFound, errHandler } = require('../middlewares/errHandler')

const initRoutes = (app) => {
    app.use('/api/user', userRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/class', classRouter);
    app.use('/api/grade', gradeRouter);
    app.use('/api/grade-review', gradeReviewRouter);
    app.use('/api/notification', notificationRouter);
    app.use(notFound);
    app.use(errHandler);

}
module.exports = initRoutes