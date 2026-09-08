import { Router } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "../config/database";
import { loginUser } from "../services/auth.service";
import { createAuditLog } from "../services/audit.service";
import { getUserPermissions } from "../services/permission.service";
import { generateId } from "../utils/ids";

const router = Router();

const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY;


// ============================================================================
// LOGIN
// ============================================================================

router.post(
    "/login",
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message:
                        "Email and password are required",
                });

                return;
            }

            const result = await loginUser(
                email,
                password
            );

            const permissionResult =
                await getUserPermissions(
                    result.user.userId
                );

            try {
                await createAuditLog({
                    userId:
                        result.user.userId,

                    action:
                        "LOGIN",

                    module:
                        "Authentication",

                    recordId:
                        result.user.userId,

                    description:
                        `User ${result.user.fullName} logged in successfully.`,

                    ipAddress:
                        req.ip ||
                        req.socket.remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "LOGIN AUDIT ERROR:",
                    auditError
                );
            }

            res.status(200).json({
                success: true,

                message:
                    "Login successful",

                data: {
                    user:
                        result.user,

                    token:
                        result.token,

                    expiresIn:
                        result.expiresIn,

                    permissions:
                        permissionResult.permissions,
                },
            });
        } catch (error) {
            if (
                error instanceof Error &&
                error.message ===
                "Invalid email or password"
            ) {
                res.status(401).json({
                    success: false,
                    message:
                        "Invalid email or password",
                });

                return;
            }

            if (
                error instanceof Error &&
                error.message ===
                "User account is inactive"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "User account is inactive",
                });

                return;
            }

            next(error);
        }
    }
);


// ============================================================================
// INITIAL ADMIN SETUP
// ============================================================================
//
// POST /api/auth/setup-admin
//
// This is a permanent, protected bootstrap endpoint.
//
// Requirements:
//   Header: X-Admin-Setup-Key
//   Body:
//   {
//     "fullName": "Maigamba Administrator",
//     "email": "admin@maigamba.com",
//     "password": "your-password"
//   }
//
// The endpoint only works when NO Admin account exists yet.
// Once an Admin exists, it cannot be used to create another Admin.
// ============================================================================

router.post(
    "/setup-admin",
    async (req, res, next) => {
        try {
            if (!ADMIN_SETUP_KEY) {
                res.status(503).json({
                    success: false,
                    message:
                        "Admin setup is not configured.",
                });

                return;
            }

            const providedKey =
                req.headers["x-admin-setup-key"];

            if (
                typeof providedKey !== "string" ||
                providedKey.length === 0 ||
                providedKey !== ADMIN_SETUP_KEY
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Admin setup authorization failed.",
                });

                return;
            }

            const existingAdmin =
                await prisma.user.findFirst({
                    where: {
                        role: "Admin",
                    },
                    select: {
                        userId: true,
                    },
                });

            if (existingAdmin) {
                res.status(409).json({
                    success: false,
                    message:
                        "An Admin account already exists. Admin setup is no longer available.",
                });

                return;
            }

            const {
                fullName,
                email,
                password,
            } = req.body;

            if (
                typeof fullName !== "string" ||
                fullName.trim().length < 2 ||
                fullName.trim().length > 100
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Full name must be between 2 and 100 characters.",
                });

                return;
            }

            if (
                typeof email !== "string" ||
                email.trim().length === 0 ||
                email.trim().length > 255
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "A valid email address is required.",
                });

                return;
            }

            if (
                typeof password !== "string" ||
                password.length < 8 ||
                password.length > 200
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Password must be between 8 and 200 characters.",
                });

                return;
            }

            const normalizedEmail =
                email.trim().toLowerCase();

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        email: normalizedEmail,
                    },
                    select: {
                        userId: true,
                    },
                });

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists.",
                });

                return;
            }

            const passwordHash =
                await bcrypt.hash(password, 12);

            const admin =
                await prisma.user.create({
                    data: {
                        userId:
                            generateId("USR"),

                        fullName:
                            fullName.trim(),

                        email:
                            normalizedEmail,

                        role:
                            "Admin",

                        status:
                            "Active",

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

            res.status(201).json({
                success: true,
                message:
                    "Admin account created successfully.",
                data: admin,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;