const jwt = require('jsonwebtoken')

const generateAccessToken =(uid)=>{
    return jwt.sign({_id:uid},process.env.JWT_SECRET,{expiresIn: '30m'})

}
const generateRefreshToken =(uid)=>{
    return jwt.sign({_id:uid},process.env.JWT_SECRET,{expiresIn: '7d'})

}

module.exports={
    generateAccessToken,
    generateRefreshToken
}