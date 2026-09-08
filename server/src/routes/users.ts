import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

import {
    grantUserPermission,
    revokeUserPermission,
    setUserPermissions,
    PERMISSIONS,
} from "../services/permission.service";

import { validate } from "../middleware/validate";

import {
    createUserSchema,
    updateUserSchema,
    userIdSchema,
    updateUserPermissionsSchema,
    singlePermissionSchema,
} from "../validation/user.schema";

const router = Router();

/*
|--------------------------------------------------------------------------
| USER ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| users.view
| users.create
| users.update
| users.delete
| users.permissions
|
*/

/*
|--------------------------------------------------------------------------
| COMMON USER SELECT
|--------------------------------------------------------------------------
*/

const userSelect = {
    id: true,
    userId: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true,
};

/*
|--------------------------------------------------------------------------
| GET ALL USERS
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticate,
    requirePermission("users.view"),
    async (_req, res, next) => {
        try {
            const users =
                await prisma.user.findMany({
                    select: userSelect,

                    orderBy: {
                        createdAt: "desc",
                    },
                });

            res.json({
                success: true,
                data: users,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE USER
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    authenticate,
    requirePermission("users.view"),
    validate(userIdSchema),
    async (req, res, next) => {
        try {
            const user =
                await prisma.user.findUnique({
                    where: {
                        userId: req.params.id,
                    },

                    select: userSelect,
                });

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });

                return;
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| CREATE USER
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticate,
    requirePermission("users.create"),
    validate(createUserSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                fullName,
                email,
                phone,
                role,
                status,
                password,
            } = req.body;

            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();

            /*
            --------------------------------------------------------------
            Check existing user
            --------------------------------------------------------------
            */

            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        email: normalizedEmail,
                    },
                });

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message:
                        "A user with this email already exists",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Prevent non-admin users from creating Admin accounts
            --------------------------------------------------------------
            */

            if (
                role === "Admin" &&
                req.user?.role !== "Admin"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Only an Admin can create an Admin account.",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Hash password
            --------------------------------------------------------------
            */

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            /*
            --------------------------------------------------------------
            Create user
            --------------------------------------------------------------
            */

            const user =
                await prisma.user.create({
                    data: {
                        userId:
                            generateId("USR"),

                        fullName:
                            fullName.trim(),

                        email:
                            normalizedEmail,

                        phone:
                            phone
                                ? String(
                                    phone
                                ).trim()
                                : null,

                        role,

                        status,

                        passwordHash,
                    },

                    select: userSelect,
                });

            /*
            --------------------------------------------------------------
            Audit Trail
            --------------------------------------------------------------
            */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "CREATE",

                    module: "Users",

                    recordId:
                        user.userId,

                    description:
                        `User ${user.fullName} created. Email: ${user.email}, role: ${user.role}, status: ${user.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create user audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "User created successfully",
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| UPDATE USER
|--------------------------------------------------------------------------
*/

router.put(
    "/:id",
    authenticate,
    requirePermission("users.update"),
    validate(updateUserSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },
                });

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const {
                fullName,
                email,
                phone,
                role,
                status,
                password,
            } = req.body;

            /*
            --------------------------------------------------------------
            Prevent self role changes
            --------------------------------------------------------------
            */

            if (
                req.user?.userId ===
                    existingUser.userId &&
                role !== undefined &&
                role !== existingUser.role
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "You cannot change your own role.",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Prevent non-admin Admin role assignment
            --------------------------------------------------------------
            */

            if (
                role === "Admin" &&
                req.user?.role !== "Admin"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "Only an Admin can assign the Admin role.",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Normalize email
            --------------------------------------------------------------
            */

            const normalizedEmail =
                email !== undefined
                    ? String(email)
                        .trim()
                        .toLowerCase()
                    : undefined;

            /*
            --------------------------------------------------------------
            Duplicate email check
            --------------------------------------------------------------
            */

            if (
                normalizedEmail !== undefined &&
                normalizedEmail !==
                    existingUser.email
            ) {
                const duplicate =
                    await prisma.user.findUnique({
                        where: {
                            email:
                                normalizedEmail,
                        },
                    });

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "A user with this email already exists",
                    });

                    return;
                }
            }

            /*
            --------------------------------------------------------------
            Prepare update data
            --------------------------------------------------------------
            */

            const data: {
                fullName?: string;
                email?: string;
                phone?: string | null;
                role?: string;
                status?: string;
                passwordHash?: string;
            } = {};

            if (
                fullName !== undefined
            ) {
                data.fullName =
                    fullName.trim();
            }

            if (
                normalizedEmail !==
                undefined
            ) {
                data.email =
                    normalizedEmail;
            }

            if (
                phone !== undefined
            ) {
                data.phone =
                    phone
                        ? String(
                            phone
                        ).trim()
                        : null;
            }

            if (
                role !== undefined
            ) {
                data.role = role;
            }

            if (
                status !== undefined
            ) {
                data.status = status;
            }

            if (
                password !== undefined
            ) {
                data.passwordHash =
                    await bcrypt.hash(
                        password,
                        12
                    );
            }

            /*
            --------------------------------------------------------------
            Update user
            --------------------------------------------------------------
            */

            const user =
                await prisma.user.update({
                    where: {
                        userId:
                            req.params.id,
                    },

                    data,

                    select: userSelect,
                });

            /*
            --------------------------------------------------------------
            Audit changes
            --------------------------------------------------------------
            */

            try {
                const changes: string[] =
                    [];

                if (
                    fullName !== undefined
                ) {
                    changes.push(
                        "full name"
                    );
                }

                if (
                    normalizedEmail !==
                    undefined
                ) {
                    changes.push(
                        "email"
                    );
                }

                if (
                    phone !== undefined
                ) {
                    changes.push(
                        "phone"
                    );
                }

                if (
                    role !== undefined
                ) {
                    changes.push(
                        `role (${existingUser.role} -> ${user.role})`
                    );
                }

                if (
                    status !== undefined
                ) {
                    changes.push(
                        `status (${existingUser.status} -> ${user.status})`
                    );
                }

                if (
                    password !== undefined
                ) {
                    changes.push(
                        "password"
                    );
                }

                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "UPDATE",

                    module: "Users",

                    recordId:
                        user.userId,

                    description:
                        `User ${user.fullName} updated. Changed: ${
                            changes.length > 0
                                ? changes.join(", ")
                                : "No tracked fields"
                        }.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create user update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "User updated successfully",
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| DEACTIVATE USER
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/deactivate",
    authenticate,
    requirePermission("users.update"),
    validate(userIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },
                });

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Prevent self deactivation
            --------------------------------------------------------------
            */

            if (
                req.user?.userId ===
                existingUser.userId
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "You cannot deactivate your own user account.",
                });

                return;
            }

            const user =
                await prisma.user.update({
                    where: {
                        userId:
                            req.params.id,
                    },

                    data: {
                        status:
                            "Inactive",
                    },

                    select: userSelect,
                });

            /*
            --------------------------------------------------------------
            Audit Trail
            --------------------------------------------------------------
            */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DEACTIVATE",

                    module:
                        "Users",

                    recordId:
                        user.userId,

                    description:
                        `User ${user.fullName} deactivated. Previous status: ${existingUser.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create user deactivation audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "User deactivated successfully",
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| DELETE USER
|--------------------------------------------------------------------------
*/

router.delete(
    "/:id",
    authenticate,
    requirePermission("users.delete"),
    validate(userIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const existingUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },
                });

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Prevent self deletion
            --------------------------------------------------------------
            */

            if (
                req.user?.userId ===
                existingUser.userId
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "You cannot delete your own user account.",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Delete user
            --------------------------------------------------------------
            */

            await prisma.user.delete({
                where: {
                    userId:
                        req.params.id,
                },
            });

            /*
            --------------------------------------------------------------
            Audit Trail
            --------------------------------------------------------------
            */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "DELETE",

                    module: "Users",

                    recordId:
                        existingUser.userId,

                    description:
                        `User ${existingUser.fullName} deleted. Email: ${existingUser.email}, role: ${existingUser.role}, status: ${existingUser.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create user delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "User deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET USER PERMISSIONS
|--------------------------------------------------------------------------
*/

router.get(
    "/:id/permissions",
    authenticate,
    requirePermission("users.permissions"),
    validate(userIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const user =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },

                    select: {
                        userId: true,
                        fullName: true,
                        email: true,
                        role: true,
                        status: true,

                        permissions: {
                            where: {
                                granted: true,
                            },

                            select: {
                                userPermissionId:
                                    true,

                                granted:
                                    true,

                                permission: {
                                    select: {
                                        permissionId:
                                            true,

                                        code: true,

                                        name: true,

                                        description:
                                            true,

                                        module: true,
                                    },
                                },
                            },
                        },
                    },
                });

            if (!user) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Audit Trail
            --------------------------------------------------------------
            */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "VIEW_PERMISSIONS",

                    module:
                        "Users",

                    recordId:
                        user.userId,

                    description:
                        `Permissions viewed for user ${user.fullName} (${user.userId}).`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create permission audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| GET ALL AVAILABLE PERMISSIONS
|--------------------------------------------------------------------------
*/

router.get(
    "/permissions/all",
    authenticate,
    requirePermission("users.permissions"),
    async (_req, res, next) => {
        try {
            res.json({
                success: true,
                data: PERMISSIONS,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| UPDATE USER PERMISSIONS
|--------------------------------------------------------------------------
|
| PUT /api/users/:id/permissions
|
| Body:
|
| {
|     "permissionCodes": [
|         "products.view",
|         "products.update",
|         "sales.view"
|     ]
| }
|
*/

router.put(
    "/:id/permissions",
    authenticate,
    requirePermission("users.permissions"),
    validate(updateUserPermissionsSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },

                    select: {
                        userId: true,
                        fullName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                });

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Permission list is validated by Zod
            --------------------------------------------------------------
            */

            const permissionCodes =
                req.body.permissionCodes as string[];

            /*
            --------------------------------------------------------------
            Normalize permission codes
            --------------------------------------------------------------
            */

            const normalizedCodes: string[] =
                Array.from(
                    new Set<string>(
                        permissionCodes.map(
                            (code: string) =>
                                code.trim()
                        )
                    )
                );

            /*
            --------------------------------------------------------------
            Validate against known permissions
            --------------------------------------------------------------
            */

            const invalidCodes =
                normalizedCodes.filter(
                    (code) =>
                        !PERMISSIONS.some(
                            (
                                permission
                            ) =>
                                permission.code ===
                                code
                        )
                );

            if (
                invalidCodes.length >
                0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        `Invalid permission(s): ${invalidCodes.join(", ")}`,
                });

                return;
            }

            /*
            --------------------------------------------------------------
            Get existing direct permissions
            --------------------------------------------------------------
            */

            const before =
                await prisma.userPermission.findMany(
                    {
                        where: {
                            userId:
                                targetUser.userId,

                            granted: true,
                        },

                        select: {
                            permission: {
                                select: {
                                    code: true,
                                },
                            },
                        },
                    }
                );

            const beforeCodes: string[] =
                before.map(
                    (item) =>
                        item.permission.code
                );

            /*
            --------------------------------------------------------------
            Replace direct permissions
            --------------------------------------------------------------
            */

            const result =
                await setUserPermissions(
                    targetUser.userId,
                    normalizedCodes
                );

            /*
            --------------------------------------------------------------
            Determine changes
            --------------------------------------------------------------
            */

            const beforeSet =
                new Set<string>(
                    beforeCodes
                );

            const afterSet =
                new Set<string>(
                    normalizedCodes
                );

            const granted: string[] =
                normalizedCodes.filter(
                    (code: string) =>
                        !beforeSet.has(code)
                );

            const revoked: string[] =
                beforeCodes.filter(
                    (code: string) =>
                        !afterSet.has(code)
                );

            /*
            --------------------------------------------------------------
            Audit Trail
            --------------------------------------------------------------
            */

            try {
                if (
                    granted.length > 0
                ) {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "GRANT_PERMISSION",

                        module: "Users",

                        recordId:
                            targetUser.userId,

                        description:
                            `Permissions granted to ${targetUser.fullName}: ${granted.join(", ")}.`,

                        ipAddress:
                            req.ip,
                    });
                }

                if (
                    revoked.length > 0
                ) {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "REVOKE_PERMISSION",

                        module: "Users",

                        recordId:
                            targetUser.userId,

                        description:
                            `Permissions revoked from ${targetUser.fullName}: ${revoked.join(", ")}.`,

                        ipAddress:
                            req.ip,
                    });
                }

                if (
                    granted.length === 0 &&
                    revoked.length === 0
                ) {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "UPDATE_PERMISSIONS",

                        module: "Users",

                        recordId:
                            targetUser.userId,

                        description:
                            `User permissions reviewed for ${targetUser.fullName}. No permission changes were made.`,

                        ipAddress:
                            req.ip,
                    });
                }
            } catch (auditError) {
                console.error(
                    "Failed to create user permission audit log:",
                    auditError
                );
            }

            /*
            --------------------------------------------------------------
            Response
            --------------------------------------------------------------
            */

            res.json({
                success: true,

                message:
                    "User permissions updated successfully",

                data: {
                    user: targetUser,

                    role:
                        result.role,

                    status:
                        result.status,

                    effectivePermissions:
                        result.permissions,

                    directPermissions:
                        normalizedCodes,

                    changes: {
                        granted,

                        revoked,
                    },
                },
            });
        } catch (error: any) {
            if (
                error?.message?.includes(
                    "User not found"
                ) ||
                error?.message?.includes(
                    "Permission not found"
                ) ||
                error?.message?.includes(
                    "Unknown permission"
                )
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        error.message,
                });

                return;
            }

            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| GRANT SINGLE PERMISSION
|--------------------------------------------------------------------------
*/

router.post(
    "/:id/permissions/grant",
    authenticate,
    requirePermission("users.permissions"),
    validate(singlePermissionSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },

                    select: {
                        userId: true,
                        fullName: true,
                    },
                });

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const permissionCode =
                req.body.permissionCode as string;

            const permission =
                await prisma.permission.findUnique(
                    {
                        where: {
                            code:
                                permissionCode.trim(),
                        },
                    }
                );

            if (!permission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found: ${permissionCode}`,
                });

                return;
            }

            const result =
                await grantUserPermission(
                    targetUser.userId,
                    permissionCode.trim()
                );

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "GRANT_PERMISSION",

                    module:
                        "Users",

                    recordId:
                        targetUser.userId,

                    description:
                        `Permission ${permissionCode.trim()} granted to ${targetUser.fullName}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create grant permission audit log:",
                    auditError
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Permission granted successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| REVOKE SINGLE PERMISSION
|--------------------------------------------------------------------------
*/

router.post(
    "/:id/permissions/revoke",
    authenticate,
    requirePermission("users.permissions"),
    validate(singlePermissionSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            req.params.id,
                    },

                    select: {
                        userId: true,
                        fullName: true,
                    },
                });

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const permissionCode =
                req.body.permissionCode as string;

            const permission =
                await prisma.permission.findUnique(
                    {
                        where: {
                            code:
                                permissionCode.trim(),
                        },
                    }
                );

            if (!permission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found: ${permissionCode}`,
                });

                return;
            }

            const result =
                await revokeUserPermission(
                    targetUser.userId,
                    permissionCode.trim()
                );

            try {
                if (result.revoked) {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "REVOKE_PERMISSION",

                        module:
                            "Users",

                        recordId:
                            targetUser.userId,

                        description:
                            `Permission ${permissionCode.trim()} revoked from ${targetUser.fullName}.`,

                        ipAddress:
                            req.ip,
                    });
                }
            } catch (auditError) {
                console.error(
                    "Failed to create revoke permission audit log:",
                    auditError
                );
            }

            res.status(200).json({
                success: true,
                message:
                    result.message,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

export default router;