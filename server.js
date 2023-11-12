const express=require("express")
require('dotenv').config()

const app=express();
const port=process.env.PORT || 8888


//doc data kieu json
app.use(express.json());
//doc data kieu array , object,...
app.use(express.urlencoded({extended:true}))
app.use('/',(req,res)=>{
    res.send("Server on")
})

app.listen(port,()=>{
    console.log("Server running")
})