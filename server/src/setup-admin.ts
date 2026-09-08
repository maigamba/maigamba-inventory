import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";

import { prisma } from "./config/database";
import { generateId } from "./utils/ids";

const ADMIN_EMAIL = "admin@maigamba.com";

function askQuestion(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function setupAdmin() {
    try {
        console.log("");
        console.log("==============================================");
        console.log("   MAIGAMBA INVENTORY - ADMIN SETUP");
        console.log("==============================================");
        console.log("");

        const existingAdmin = await prisma.user.findUnique({
            where: {
                email: ADMIN_EMAIL,
            },
        });

        if (existingAdmin) {
            console.log(`An account with ${ADMIN_EMAIL} already exists.`);
            console.log("Admin setup cancelled.");
            return;
        }

        const fullName = await askQuestion("Enter Admin full name: ");

        if (!fullName.trim()) {
            throw new Error("Full name is required.");
        }

        const password = await askQuestion(
            "Enter Admin password (minimum 8 characters): "
        );

        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }

        const confirmPassword = await askQuestion(
            "Confirm Admin password: "
        );

        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const admin = await prisma.user.create({
            data: {
                userId: generateId("USR"),
                fullName: fullName.trim(),
                email: ADMIN_EMAIL,
                role: "Admin",
                status: "Active",
                passwordHash,
            },
            select: {
                userId: true,
                fullName: true,
                email: true,
                role: true,
                status: true,
            },
        });

        console.log("");
        console.log("==============================================");
        console.log("   ADMIN CREATED SUCCESSFULLY");
        console.log("==============================================");
        console.log(`User ID: ${admin.userId}`);
        console.log(`Name:    ${admin.fullName}`);
        console.log(`Email:   ${admin.email}`);
        console.log(`Role:    ${admin.role}`);
        console.log(`Status:  ${admin.status}`);
        console.log("==============================================");
        console.log("");
        console.log("You can now use this account to log in.");
        console.log("");
    } catch (error) {
        console.error("");
        console.error(
            "Admin setup failed:",
            error instanceof Error ? error.message : error
        );
        console.error("");
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

void setupAdmin();