import app from "../server/src/app.js";
import { connectMongoDB } from "../server/src/config/mongodb.js";
import { seedPermissions } from "../server/src/services/permission.service.js";

let initializationPromise: Promise<void> | null = null;

async function initialize() {
    await connectMongoDB();
    await seedPermissions();
}

export default async function handler(
    req: Parameters<typeof app>[0],
    res: Parameters<typeof app>[1]
) {
    if (!initializationPromise) {
        initializationPromise = initialize().catch((error) => {
            initializationPromise = null;
            throw error;
        });
    }

    await initializationPromise;

    return app(req, res);
}
