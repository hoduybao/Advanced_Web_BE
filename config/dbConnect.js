const {default : mongoose} =require("mongoose");


const dbConnect=async ()=>{
    try {
        const con = await mongoose.connect(process.env.MONGODB_URI);
        if (con.connection.readyState === 1)
          console.log("DB connection is successfully!");
        else console.log("Connection is falied!");
      } catch (error) {
        throw new Error(error);
      }
}

module.exports=dbConnect