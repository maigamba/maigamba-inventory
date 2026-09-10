import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
}

export async function connectMongoDB(): Promise<void> {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("==============================================");
        console.log("   MONGODB ATLAS CONNECTED");
        console.log("==============================================");
        console.log(`Database: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);
        console.log("==============================================");
    } catch (error) {
        console.error("MongoDB Atlas connection failed:", error);
        throw error;
    }
}

export async function disconnectMongoDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log("MongoDB Atlas disconnected.");
    }
}