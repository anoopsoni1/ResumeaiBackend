import {app} from "./app.js"
import { connectDB } from "./DB/index.js";

import dotenv from "dotenv";


dotenv.config();


connectDB().then(()=>{
 app.listen(process.env.PORT || 3000, ()=>{
 console.log(`Server is running at port ${process.env.PORT||3000} `);
})

}).catch("error")


