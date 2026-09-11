import mongoose from "mongoose";
import dns from "node:dns";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
}

// Use Google DNS for MongoDB Atlas SRV resolution.
// This fixes Node.js DNS resolver issues on some Windows networks.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let isConnected = false;

export async function connectMongoDB(): Promise<void> {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        isConnected = true;

        console.log("==============================================");
        console.log("   MONGODB ATLAS CONNECTED");
        console.log("==============================================");
        console.log(`Database: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);
        console.log("==============================================");
    } catch (error) {
        isConnected = false;
        console.error("MongoDB Atlas connection failed:", error);
        throw error;
    }
}

export async function disconnectMongoDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isConnected = false;
        console.log("MongoDB Atlas disconnected.");
    }
}