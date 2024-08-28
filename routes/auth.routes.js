const Router = require('express')
const { register, login, refreshToken } = require('../controllers/auth.controllers')

const authRouter = Router()

authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.get("/refreshToken",refreshToken)

module.exports = authRouter;