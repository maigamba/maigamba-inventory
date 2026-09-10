import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";

import User from "./models/User.js";
import {
    connectMongoDB,
    disconnectMongoDB,
} from "./config/mongodb.js";
import { generateMongoId } from "./utils/mongoId.js";

const ADMIN_EMAIL = "admin@maigamba.com";

function askQuestion(
    question: string
): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(
            question,
            (answer) => {
                rl.close();
                resolve(answer);
            }
        );
    });
}

async function setupAdmin() {
    try {
        console.log("");
        console.log(
            "=============================================="
        );
        console.log(
            "   MAIGAMBA INVENTORY - ADMIN SETUP"
        );
        console.log(
            "=============================================="
        );
        console.log("");

        /*
         * Connect to MongoDB Atlas.
         */
        await connectMongoDB();

        /*
         * Check whether the admin account
         * already exists.
         */
        const existingAdmin =
            await User.findOne({
                email: ADMIN_EMAIL,
            }).lean();

        if (existingAdmin) {
            console.log(
                `An account with ${ADMIN_EMAIL} already exists.`
            );
            console.log(
                "Admin setup cancelled."
            );
            return;
        }

        const fullName =
            await askQuestion(
                "Enter Admin full name: "
            );

        if (!fullName.trim()) {
            throw new Error(
                "Full name is required."
            );
        }

        const password =
            await askQuestion(
                "Enter Admin password (minimum 8 characters): "
            );

        if (password.length < 8) {
            throw new Error(
                "Password must be at least 8 characters."
            );
        }

        const confirmPassword =
            await askQuestion(
                "Confirm Admin password: "
            );

        if (
            password !==
            confirmPassword
        ) {
            throw new Error(
                "Passwords do not match."
            );
        }

        /*
         * Hash the admin password.
         */
        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        /*
         * Create the admin in MongoDB.
         */
        const admin =
            await User.create({
                userId:
                    generateMongoId(
                        "USR"
                    ),

                fullName:
                    fullName.trim(),

                email:
                    ADMIN_EMAIL,

                role: "Admin",

                status: "Active",

                passwordHash,
            });

        console.log("");
        console.log(
            "=============================================="
        );
        console.log(
            "   ADMIN CREATED SUCCESSFULLY"
        );
        console.log(
            "=============================================="
        );
        console.log(
            `User ID: ${admin.userId}`
        );
        console.log(
            `Name:    ${admin.fullName}`
        );
        console.log(
            `Email:   ${admin.email}`
        );
        console.log(
            `Role:    ${admin.role}`
        );
        console.log(
            `Status:  ${admin.status}`
        );
        console.log(
            "=============================================="
        );
        console.log("");
        console.log(
            "You can now use this account to log in."
        );
        console.log("");
    } catch (error) {
        console.error("");
        console.error(
            "Admin setup failed:",
            error instanceof Error
                ? error.message
                : error
        );
        console.error("");
        process.exitCode = 1;
    } finally {
        /*
         * Close the MongoDB connection.
         */
        await disconnectMongoDB();
    }
}

void setupAdmin();
