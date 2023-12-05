const userRouter = require('./user');
const authRouter = require('./auth');
const classRouter = require('./class');

const { notFound, errHandler } = require('../middlewares/errHandler')

const initRoutes = (app) => {
    app.use('/api/user', userRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/class', classRouter);

    app.use(notFound);
    app.use(errHandler);

}
module.exports = initRoutes