import { Router } from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Permission from "../models/Permission.js";
import UserPermission from "../models/UserPermission.js";

import { generateMongoId } from "../utils/mongoId.js";
import { createAuditLog } from "../services/audit.service.js";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth.js";

import { PERMISSIONS } from "../services/permission.service.js";

import { validate } from "../middleware/validate.js";

import {
    createUserSchema,
    updateUserSchema,
    userIdSchema,
    updateUserPermissionsSchema,
    singlePermissionSchema,
} from "../validation/user.schema.js";

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
| COMMON USER RESPONSE
|--------------------------------------------------------------------------
*/

function formatUser(user: any) {
    if (!user) {
        return user;
    }

    return {
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

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
            const users = await User.find({})
                .select(
                    "userId fullName email phone role status createdAt updatedAt"
                )
                .sort({
                    createdAt: -1,
                })
                .lean();

            res.json({
                success: true,
                data: users.map(formatUser),
            });
        } catch (error) {
            console.error(
                "[USERS] FETCH ERROR:",
                error
            );

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
            const user = await User.findOne({
                userId: req.params.id,
            })
                .select(
                    "userId fullName email phone role status createdAt updatedAt"
                )
                .lean();

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: "User not found",
                });

                return;
            }

            res.json({
                success: true,
                data: formatUser(user),
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
             * Check existing user.
             */

            const existingUser =
                await User.findOne({
                    email: normalizedEmail,
                }).lean();

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    message:
                        "A user with this email already exists",
                });

                return;
            }

            /*
             * Prevent non-admin users
             * from creating Admin accounts.
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
             * Hash password.
             */

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            /*
             * Create user.
             */

            const user =
                await User.create({
                    userId:
                        generateMongoId(
                            "USR"
                        ),

                    fullName:
                        String(
                            fullName
                        ).trim(),

                    email:
                        normalizedEmail,

                    phone:
                        phone
                            ? String(
                                phone
                            ).trim()
                            : undefined,

                    role,

                    status,

                    passwordHash,
                });

            const formattedUser =
                formatUser(
                    user.toObject()
                );

            /*
             * Audit trail.
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
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: formattedUser,
            });
        } catch (error: any) {
            /*
             * MongoDB duplicate-key protection.
             */

            if (
                error?.code === 11000
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "A user with this email or ID already exists",
                });

                return;
            }

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
                await User.findOne({
                    userId:
                        req.params.id,
                }).lean();

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
             * Prevent self role changes.
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
             * Prevent non-admin Admin role assignment.
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
             * Normalize email.
             */

            const normalizedEmail =
                email !== undefined
                    ? String(email)
                        .trim()
                        .toLowerCase()
                    : undefined;

            /*
             * Duplicate email check.
             */

            if (
                normalizedEmail !==
                undefined &&
                normalizedEmail !==
                existingUser.email
            ) {
                const duplicate =
                    await User.findOne({
                        email:
                            normalizedEmail,

                        userId: {
                            $ne:
                                req.params.id,
                        },
                    }).lean();

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
             * Prepare update data.
             */

            const data: Record<
                string,
                any
            > = {};

            if (
                fullName !== undefined
            ) {
                data.fullName =
                    String(
                        fullName
                    ).trim();
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
                        : undefined;
            }

            if (
                role !== undefined
            ) {
                data.role = role;
            }

            if (
                status !== undefined
            ) {
                data.status =
                    status;
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
             * Update user.
             */

            const user =
                await User.findOneAndUpdate(
                    {
                        userId:
                            req.params.id,
                    },
                    {
                        $set: data,
                    },
                    {
                        returnDocument: "after",
                        runValidators:
                            true,
                    }
                ).lean();

            if (!user) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
             * Audit changes.
             */

            try {
                const changes: string[] =
                    [];

                if (
                    fullName !==
                    undefined
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
                    phone !==
                    undefined
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
                    password !==
                    undefined
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
                        `User ${user.fullName} updated. Changed: ${changes.length >
                            0
                            ? changes.join(
                                ", "
                            )
                            : "No tracked fields"
                        }.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: formatUser(user),
            });
        } catch (error: any) {
            if (
                error?.code === 11000
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        "A user with this email already exists",
                });

                return;
            }

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
                await User.findOne({
                    userId:
                        req.params.id,
                }).lean();

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
             * Prevent self deactivation.
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
                await User.findOneAndUpdate(
                    {
                        userId:
                            req.params.id,
                    },
                    {
                        $set: {
                            status:
                                "Inactive",
                        },
                    },
                    {
                        returnDocument: "after",
                    }
                ).lean();

            if (!user) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
             * Audit trail.
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
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: formatUser(user),
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
                await User.findOne({
                    userId:
                        req.params.id,
                }).lean();

            if (!existingUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
             * Prevent self deletion.
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
             * Delete user's direct
             * permission assignments first.
             */

            await UserPermission.deleteMany(
                {
                    userId:
                        existingUser.userId,
                }
            );

            /*
             * Delete user.
             */

            await User.deleteOne({
                userId:
                    req.params.id,
            });

            /*
             * Audit trail.
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
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                await User.findOne({
                    userId:
                        req.params.id,
                })
                    .select(
                        "userId fullName email role status"
                    )
                    .lean();

            if (!user) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            /*
             * Get direct granted permissions.
             */

            const assignments =
                await UserPermission.find({
                    userId:
                        user.userId,
                    granted: true,
                }).lean();

            const permissionIds =
                assignments.map(
                    (
                        item
                    ) =>
                        item.permissionId
                );

            const permissions =
                permissionIds.length >
                    0
                    ? await Permission.find(
                        {
                            permissionId:
                            {
                                $in:
                                    permissionIds,
                            },
                        }
                    )
                        .sort({
                            module: 1,
                            code: 1,
                        })
                        .lean()
                    : [];

            const formattedPermissions =
                assignments
                    .map(
                        (
                            assignment
                        ) => {
                            const permission =
                                permissions.find(
                                    (
                                        item
                                    ) =>
                                        item.permissionId ===
                                        assignment.permissionId
                                );

                            if (
                                !permission
                            ) {
                                return null;
                            }

                            return {
                                userPermissionId:
                                    assignment.userPermissionId,

                                granted:
                                    assignment.granted,

                                permission: {
                                    permissionId:
                                        permission.permissionId,

                                    code:
                                        permission.code,

                                    name:
                                        permission.name,

                                    description:
                                        permission.description ??
                                        null,

                                    module:
                                        permission.module,
                                },
                            };
                        }
                    )
                    .filter(
                        Boolean
                    );

            /*
             * Audit trail.
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
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create permission audit log:",
                    auditError
                );
            }

            res.json({
                success: true,

                data: {
                    ...user,

                    permissions:
                        formattedPermissions,
                },
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
    requirePermission(
        "users.permissions"
    ),
    async (_req, res, next) => {
        try {
            /*
             * Return database permissions
             * when available.
             */

            const databasePermissions =
                await Permission.find({})
                    .sort({
                        module: 1,
                        code: 1,
                    })
                    .lean();

            /*
             * If permissions have not yet
             * been seeded into MongoDB, keep
             * the existing application
             * permission list available.
             */

            const data =
                databasePermissions.length >
                    0
                    ? databasePermissions
                    : PERMISSIONS;

            res.json({
                success: true,
                data,
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
|--------------------------------------------------------------------------
*/

router.put(
    "/:id/permissions",
    authenticate,
    requirePermission(
        "users.permissions"
    ),
    validate(
        updateUserPermissionsSchema
    ),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await User.findOne({
                    userId:
                        req.params.id,
                })
                    .select(
                        "userId fullName email role status"
                    )
                    .lean();

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const permissionCodes =
                req.body
                    .permissionCodes as string[];

            /*
             * Normalize permission codes.
             */

            const normalizedCodes:
                string[] =
                Array.from(
                    new Set(
                        permissionCodes.map(
                            (
                                code: string
                            ) =>
                                code.trim()
                        )
                    )
                );

            /*
             * Validate against known
             * application permissions.
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
             * Resolve permissions from MongoDB.
             */

            const mongoPermissions =
                normalizedCodes.length >
                    0
                    ? await Permission.find(
                        {
                            code: {
                                $in:
                                    normalizedCodes,
                            },
                        }
                    ).lean()
                    : [];

            /*
             * Check that every requested
             * permission exists in MongoDB.
             */

            const mongoCodes =
                new Set(
                    mongoPermissions.map(
                        (
                            permission
                        ) =>
                            permission.code
                    )
                );

            const missingMongoPermissions =
                normalizedCodes.filter(
                    (code) =>
                        !mongoCodes.has(
                            code
                        )
                );

            if (
                missingMongoPermissions.length >
                0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        `Permission(s) not found in MongoDB: ${missingMongoPermissions.join(", ")}`,
                });

                return;
            }

            /*
             * Get current direct permissions.
             */

            const before =
                await UserPermission.find(
                    {
                        userId:
                            targetUser.userId,
                        granted: true,
                    }
                ).lean();

            const permissionIds =
                before.map(
                    (
                        item
                    ) =>
                        item.permissionId
                );

            const beforePermissions =
                permissionIds.length >
                    0
                    ? await Permission.find(
                        {
                            permissionId:
                            {
                                $in:
                                    permissionIds,
                            },
                        }
                    )
                        .select(
                            "permissionId code"
                        )
                        .lean()
                    : [];

            const beforeCodes =
                beforePermissions.map(
                    (
                        permission
                    ) =>
                        permission.code
                );

            /*
             * Replace all direct permissions.
             */

            await UserPermission.deleteMany(
                {
                    userId:
                        targetUser.userId,
                }
            );

            if (
                mongoPermissions.length >
                0
            ) {
                await UserPermission.insertMany(
                    mongoPermissions.map(
                        (
                            permission
                        ) => ({
                            userPermissionId:
                                generateMongoId(
                                    "UPR"
                                ),

                            userId:
                                targetUser.userId,

                            permissionId:
                                permission.permissionId,

                            granted:
                                true,
                        })
                    )
                );
            }

            /*
             * Determine changes.
             */

            const beforeSet =
                new Set(
                    beforeCodes
                );

            const afterSet =
                new Set(
                    normalizedCodes
                );

            const granted =
                normalizedCodes.filter(
                    (
                        code
                    ) =>
                        !beforeSet.has(
                            code
                        )
                );

            const revoked =
                beforeCodes.filter(
                    (
                        code
                    ) =>
                        !afterSet.has(
                            code
                        )
                );

            /*
             * Audit trail.
             */

            try {
                if (
                    granted.length >
                    0
                ) {
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
                            `Permissions granted to ${targetUser.fullName}: ${granted.join(", ")}.`,

                        ipAddress:
                            req.ip ||
                            req.socket
                                .remoteAddress ||
                            undefined,
                    });
                }

                if (
                    revoked.length >
                    0
                ) {
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
                            `Permissions revoked from ${targetUser.fullName}: ${revoked.join(", ")}.`,

                        ipAddress:
                            req.ip ||
                            req.socket
                                .remoteAddress ||
                            undefined,
                    });
                }

                if (
                    granted.length ===
                    0 &&
                    revoked.length ===
                    0
                ) {
                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "UPDATE_PERMISSIONS",

                        module:
                            "Users",

                        recordId:
                            targetUser.userId,

                        description:
                            `User permissions reviewed for ${targetUser.fullName}. No permission changes were made.`,

                        ipAddress:
                            req.ip ||
                            req.socket
                                .remoteAddress ||
                            undefined,
                    });
                }
            } catch (auditError) {
                console.error(
                    "Failed to create user permission audit log:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "User permissions updated successfully",

                data: {
                    user:
                        targetUser,

                    role:
                        targetUser.role,

                    status:
                        targetUser.status,

                    effectivePermissions:
                        normalizedCodes,

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
    requirePermission(
        "users.permissions"
    ),
    validate(
        singlePermissionSchema
    ),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await User.findOne({
                    userId:
                        req.params.id,
                })
                    .select(
                        "userId fullName"
                    )
                    .lean();

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const permissionCode =
                String(
                    req.body
                        .permissionCode
                ).trim();

            /*
             * Validate application permission.
             */

            const knownPermission =
                PERMISSIONS.find(
                    (
                        permission
                    ) =>
                        permission.code ===
                        permissionCode
                );

            if (!knownPermission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found: ${permissionCode}`,
                });

                return;
            }

            /*
             * Find permission in MongoDB.
             */

            const permission =
                await Permission.findOne({
                    code:
                        permissionCode,
                }).lean();

            if (!permission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found in MongoDB: ${permissionCode}`,
                });

                return;
            }

            /*
             * Check existing assignment.
             */

            const existing =
                await UserPermission.findOne(
                    {
                        userId:
                            targetUser.userId,

                        permissionId:
                            permission.permissionId,
                    }
                );

            let result;

            if (existing) {
                existing.granted =
                    true;

                await existing.save();

                result = existing.toObject();
            } else {
                const created =
                    await UserPermission.create(
                        {
                            userPermissionId:
                                generateMongoId(
                                    "UPR"
                                ),

                            userId:
                                targetUser.userId,

                            permissionId:
                                permission.permissionId,

                            granted:
                                true,
                        }
                    );

                result =
                    created.toObject();
            }

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
                        `Permission ${permissionCode} granted to ${targetUser.fullName}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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

                data: {
                    ...result,

                    permission,
                },
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
    requirePermission(
        "users.permissions"
    ),
    validate(
        singlePermissionSchema
    ),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const targetUser =
                await User.findOne({
                    userId:
                        req.params.id,
                })
                    .select(
                        "userId fullName"
                    )
                    .lean();

            if (!targetUser) {
                res.status(404).json({
                    success: false,
                    message:
                        "User not found",
                });

                return;
            }

            const permissionCode =
                String(
                    req.body
                        .permissionCode
                ).trim();

            /*
             * Validate application permission.
             */

            const knownPermission =
                PERMISSIONS.find(
                    (
                        permission
                    ) =>
                        permission.code ===
                        permissionCode
                );

            if (!knownPermission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found: ${permissionCode}`,
                });

                return;
            }

            /*
             * Find permission in MongoDB.
             */

            const permission =
                await Permission.findOne({
                    code:
                        permissionCode,
                }).lean();

            if (!permission) {
                res.status(404).json({
                    success: false,
                    message:
                        `Permission not found in MongoDB: ${permissionCode}`,
                });

                return;
            }

            /*
             * Find existing assignment.
             */

            const existing =
                await UserPermission.findOne(
                    {
                        userId:
                            targetUser.userId,

                        permissionId:
                            permission.permissionId,
                    }
                );

            if (!existing) {
                res.status(200).json({
                    success: true,

                    message:
                        "Permission was not assigned",

                    data: {
                        revoked:
                            false,

                        message:
                            "Permission was not assigned to this user.",
                    },
                });

                return;
            }

            existing.granted =
                false;

            await existing.save();

            try {
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
                        `Permission ${permissionCode} revoked from ${targetUser.fullName}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create revoke permission audit log:",
                    auditError
                );
            }

            res.status(200).json({
                success: true,

                message:
                    "Permission revoked successfully",

                data: {
                    revoked:
                        true,

                    message:
                        "Permission revoked successfully.",

                    permission,
                },
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

