require('dotenv').config();

const express = require('express');

const http = require('http');

const cors = require('cors');

const {connectDB} = require('./config/db');

const app = express();

const server = http.createServer(app);

const PORT = process.env.PORT;

app.use(cors({
    origin:[
        `${process.env.FRONTEND_URL}`,
        'http://localhost:5173/'
    ],
    credentials:true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders:[
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Sec-Fetch-Site',
      'Sec-Fetch-Mode',
      'Sec-Fetch-Dest',
      'Accept',
      'Origin'],

}));

app.use(express.json({limit:'50mb'}));

app.use(express.urlencoded({limit:'50mb',extended:true}));

app.get('/health',(req,res) => {
        res.status(200).json({message:"Earth And Harvest Backend is UP !"})
});

const startServer = async() => {
    try{

        await connectDB();

        server.listen(PORT,() => {
            console.log(`Server Started Successfully at PORT : ${PORT}`);
        })

    }
    catch(error){
        console.error(`Error Starting Server at PORT : ${PORT}`)
        process.exit(1);
    }
}

startServer();