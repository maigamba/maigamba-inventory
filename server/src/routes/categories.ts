import { Router } from "express";
import Category from "../models/Category";
import Product from "../models/Product";
import { generateMongoId } from "../utils/mongoId";
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
| MongoDB / Mongoose version
|
| Permissions:
|
| categories.view
| categories.manage
|
*/

/**
 * Remove MongoDB internal fields from API responses.
 */
function cleanDocument(document: any) {
    if (!document) {
        return document;
    }

    const {
        _id,
        __v,
        ...data
    } = document;

    return data;
}

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
                await Category.find({})
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            /**
             * MongoDB does not have Prisma's relational include.
             *
             * Count products belonging to each category.
             */
            const data = await Promise.all(
                categories.map(async (category) => {
                    const productCount =
                        await Product.countDocuments({
                            categoryId:
                                category.categoryId,
                        });

                    return {
                        ...cleanDocument(category),
                        productCount,
                    };
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
                await Category.findOne({
                    categoryId:
                        req.params.id,
                }).lean();

            if (!category) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            const products =
                await Product.find({
                    categoryId:
                        category.categoryId,
                })
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            res.json({
                success: true,
                data: {
                    ...cleanDocument(
                        category
                    ),
                    products:
                        products.map(
                            cleanDocument
                        ),
                },
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

            /**
             * Validate name.
             */
            if (
                !name ||
                !String(name).trim()
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Category name is required",
                });

                return;
            }

            const normalizedName =
                String(name).trim();

            /**
             * Check duplicate category.
             *
             * MongoDB regex with the i flag provides
             * the same case-insensitive behavior.
             */
            const existing =
                await Category.findOne({
                    name: {
                        $regex:
                            `^${normalizedName.replace(
                                /[.*+?^${}()|[\]\\]/g,
                                "\\$&"
                            )}$`,
                        $options: "i",
                    },
                }).lean();

            if (existing) {
                res.status(409).json({
                    success: false,
                    message:
                        "Category already exists",
                });

                return;
            }

            /**
             * Create category.
             */
            const category =
                await Category.create({
                    categoryId:
                        generateMongoId(
                            "CAT"
                        ),

                    name:
                        normalizedName,

                    description:
                        description !==
                            undefined
                            ? String(
                                description
                            ).trim()
                            : undefined,

                    status:
                        String(
                            status || "Active"
                        ).trim(),
                });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} created. Status: ${category.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    category.toObject()
                ),
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
            /**
             * Find category.
             */
            const existing =
                await Category.findOne({
                    categoryId:
                        req.params.id,
                }).lean();

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

            /**
             * Check duplicate name when changing name.
             */
            if (
                name !== undefined &&
                String(name).trim() !==
                existing.name
            ) {
                const normalizedName =
                    String(name).trim();

                const duplicate =
                    await Category.findOne({
                        name: {
                            $regex:
                                `^${normalizedName.replace(
                                    /[.*+?^${}()|[\]\\]/g,
                                    "\\$&"
                                )}$`,
                            $options: "i",
                        },

                        categoryId: {
                            $ne:
                                req.params.id,
                        },
                    }).lean();

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "Category already exists",
                    });

                    return;
                }
            }

            /**
             * Build update object.
             */
            const updateData: Record<
                string,
                unknown
            > = {};

            if (name !== undefined) {
                updateData.name =
                    String(name).trim();
            }

            if (
                description !==
                undefined
            ) {
                updateData.description =
                    String(
                        description
                    ).trim();
            }

            if (status !== undefined) {
                updateData.status =
                    String(status).trim();
            }

            /**
             * Update category.
             */
            const category =
                await Category.findOneAndUpdate(
                    {
                        categoryId:
                            req.params.id,
                    },
                    {
                        $set: updateData,
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!category) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} updated. Status: ${category.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    category
                ),
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
            /**
             * Find category.
             */
            const existing =
                await Category.findOne({
                    categoryId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            /**
             * Archive category.
             */
            const category =
                await Category.findOneAndUpdate(
                    {
                        categoryId:
                            req.params.id,
                    },
                    {
                        $set: {
                            status: "Inactive",
                        },
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!category) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "ARCHIVE",

                    module:
                        "Categories",

                    recordId:
                        category.categoryId,

                    description:
                        `Category ${category.name} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
                data: cleanDocument(
                    category
                ),
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
            /**
             * Find category.
             */
            const existing =
                await Category.findOne({
                    categoryId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Category not found",
                });

                return;
            }

            /**
             * Delete category.
             */
            await Category.deleteOne({
                categoryId:
                    req.params.id,
            });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DELETE",

                    module:
                        "Categories",

                    recordId:
                        existing.categoryId,

                    description:
                        `Category ${existing.name} deleted. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
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
