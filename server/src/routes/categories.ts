import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| CATEGORY ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| categories.view
| categories.manage
|
*/

/**
 * ============================================================================
 * GET ALL CATEGORIES
 * ============================================================================
 */
router.get(
    "/",
    authenticate,
    requirePermission("categories.view"),
    async (_req, res, next) => {
        try {
            const categories =
                await prisma.category.findMany({
                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {
                        products: {
                            select: {
                                productId: true,
                            },
                        },
                    },
                });

            const data = categories.map(
                (category) => ({
                    ...category,

                    productCount:
                        category.products
                            .length,

                    products:
                        undefined,
                })
            );

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE CATEGORY
 * ============================================================================
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("categories.view"),
    async (req, res, next) => {
        try {
            const category =
                await prisma.category.findUnique({
                    where: {
                        categoryId:
                            req.params.id,
                    },

                    include: {
                        products: true,
                    },
                });

            if (!category) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            res.json({
                success: true,
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE CATEGORY
 * ============================================================================
 */
router.post(
    "/",
    authenticate,
    requirePermission("categories.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                name,
                description,
                status = "Active",
            } = req.body;

            // --------------------------------------------------------------
            // Validate name
            // --------------------------------------------------------------

            if (!name) {
                res.status(400).json({
                    success: false,
                    message:
                        "Category name is required",
                });

                return;
            }

            // --------------------------------------------------------------
            // Check duplicate category
            // --------------------------------------------------------------

            const existing =
                await prisma.category.findFirst({
                    where: {
                        name: {
                            equals: name,
                            mode: "insensitive",
                        },
                    },
                });

            if (existing) {
                res.status(409).json({
                    success: false,
                    message:
                        "Category already exists",
                });

                return;
            }

            // --------------------------------------------------------------
            // Create category
            // --------------------------------------------------------------

            const category =
                await prisma.category.create({
                    data: {
                        categoryId:
                            generateId("CAT"),

                        name,

                        description,

                        status,
                    },
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "CREATE",

                    module: "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} created. Status: ${category.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create category audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Category created successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE CATEGORY
 * ============================================================================
 */
router.put(
    "/:id",
    authenticate,
    requirePermission("categories.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find category
            // --------------------------------------------------------------

            const existing =
                await prisma.category.findUnique({
                    where: {
                        categoryId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            const {
                name,
                description,
                status,
            } = req.body;

            // --------------------------------------------------------------
            // Check duplicate name when changing name
            // --------------------------------------------------------------

            if (
                name !== undefined &&
                name.trim() !== existing.name
            ) {
                const duplicate =
                    await prisma.category.findFirst({
                        where: {
                            name: {
                                equals:
                                    name.trim(),
                                mode:
                                    "insensitive",
                            },

                            NOT: {
                                categoryId:
                                    req.params.id,
                            },
                        },
                    });

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "Category already exists",
                    });

                    return;
                }
            }

            // --------------------------------------------------------------
            // Update category
            // --------------------------------------------------------------

            const category =
                await prisma.category.update({
                    where: {
                        categoryId:
                            req.params.id,
                    },

                    data: {
                        ...(name !== undefined && {
                            name,
                        }),

                        ...(description !==
                            undefined && {
                            description,
                        }),

                        ...(status !==
                            undefined && {
                            status,
                        }),
                    },
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "UPDATE",

                    module: "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} updated. Status: ${category.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create category update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Category updated successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * ARCHIVE CATEGORY
 * ============================================================================
 */
router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("categories.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find category
            // --------------------------------------------------------------

            const existing =
                await prisma.category.findUnique({
                    where: {
                        categoryId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Archive category
            // --------------------------------------------------------------

            const category =
                await prisma.category.update({
                    where: {
                        categoryId:
                            req.params.id,
                    },

                    data: {
                        status: "Inactive",
                    },
                });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "ARCHIVE",

                    module: "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create category archive audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Category archived successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE CATEGORY
 * ============================================================================
 *
 * categories.manage is intentionally used here because the permission
 * service defines category management as one combined permission.
 */
router.delete(
    "/:id",
    authenticate,
    requirePermission("categories.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find category
            // --------------------------------------------------------------

            const existing =
                await prisma.category.findUnique({
                    where: {
                        categoryId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete category
            // --------------------------------------------------------------

            await prisma.category.delete({
                where: {
                    categoryId:
                        req.params.id,
                },
            });

            // --------------------------------------------------------------
            // Audit Trail
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action: "DELETE",

                    module: "Categories",

                    recordId:
                        existing.categoryId,

                    description:
                        `Category ${existing.name} deleted. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create category delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Category deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * EXPORT ROUTER
 * ============================================================================
 */

export default router;