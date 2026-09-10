import "dotenv/config";

import app from "./app";
import {
    connectMongoDB,
    disconnectMongoDB,
} from "./config/mongodb";
import { seedPermissions } from "./services/permission.service";

const PORT = Number(process.env.PORT) || 5000;

let server: ReturnType<typeof app.listen> | null = null;

async function startServer() {
    try {
        // Connect to MongoDB Atlas first.
        await connectMongoDB();

        // Make sure required permissions exist.
        await seedPermissions();

        server = app.listen(PORT, () => {
            console.log("");
            console.log("==============================================");
            console.log("   MAIGAMBA INVENTORY API");
            console.log("==============================================");
            console.log(`Server:   http://localhost:${PORT}`);
            console.log(
                `Health:   http://localhost:${PORT}/api/health`
            );
            console.log("Database: MongoDB Atlas");
            console.log("Security: Helmet + CORS + Rate Limiting");
            console.log("==============================================");
            console.log("");
        });
    } catch (error) {
        console.error("");
        console.error("==============================================");
        console.error("   SERVER STARTUP FAILED");
        console.error("==============================================");
        console.error(error);
        console.error("");
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    console.log("");
    console.log(`${signal} received. Shutting down...`);

    try {
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server?.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        }

        await disconnectMongoDB();

        console.log("Server stopped.");
        process.exit(0);
    } catch (error) {
        console.error("Shutdown error:", error);
        process.exit(1);
    }
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

void startServer();
