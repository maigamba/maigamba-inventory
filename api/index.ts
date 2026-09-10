import app from "../server/src/app.js";
import { connectMongoDB } from "../server/src/config/mongodb.js";
import { seedPermissions } from "../server/src/services/permission.service.js";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

async function initialize() {
    if (initialized) {
        return;
    }

    if (!initializationPromise) {
        initializationPromise = (async () => {
            await connectMongoDB();
            await seedPermissions();
            initialized = true;
        })().catch((error) => {
            initializationPromise = null;
            throw error;
        });
    }

    await initializationPromise;
}

export default async function handler(req: any, res: any) {
    try {
        await initialize();
        return app(req, res);
    } catch (error) {
        console.error("Vercel API initialization error:", error);

        return res.status(500).json({
            success: false,
            message: "API initialization failed",
        });
    }
}
