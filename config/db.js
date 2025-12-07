const mongoose = require('mongoose');

const connectDB = async() => {

    const mongoUri = process.env.MONGO_URI;

    if(!mongoUri){
        console.error("Mongo URI not found in env !")
        process.exit(1);
    }

    const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    };

    const connectWithRetry = async(retries = 5) => {
        try{

            const connection = await mongoose.connect(mongoUri,options);

            console.log("Connection with DB Established Successfully !",connection.connection.host);

        }
        catch(error){

            console.error("mongoDB Connection Error : ",error);

            if(retries === 0){
                console.error("Could not connect with DB after multiple attempts !")
                process.exit(1);
            }
            else{
                console.log("Retrying connection in 5 seconds")
                await new Promise((res) => setTimeout(res,5000))
                await connectWithRetry(retries - 1)
            }

        }
    };

    await connectWithRetry();

    const gracefulShutdown = async(signal) => {
        try{

            await mongoose.connection.close();
            console.log(`MongoDB Closed due to signal : ${signal}`);
            setTimeout(() => process.exit(0),100);
        }
        catch(error){
            console.error("MongoDB Shutdown Error : ",error);
            process.exit(1);
        }
    }

    process.on('SIGINT',() => gracefulShutdown('SIGINT'));

    process.on('SIGTERM',() => gracefulShutdown('SIGTERM'));

    process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    gracefulShutdown("uncaughtException");
});
  
    process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    gracefulShutdown("unhandledRejection");
  });


}

module.exports = {connectDB};