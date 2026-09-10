import { Router } from "express";
import Brand from "../models/Brand";
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
| BRAND ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| brands.view
| brands.manage
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
 * Escape a string before using it inside a MongoDB regex.
 */
function escapeRegex(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

/**
 * ============================================================================
 * GET ALL BRANDS
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("brands.view"),
    async (_req, res, next) => {
        try {
            const brands =
                await Brand.find({})
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            /**
             * Count products belonging to each brand.
             *
             * This replaces Prisma's relational include:
             *
             * products: {
             *     select: {
             *         productId: true
             *     }
             * }
             */
            const data = await Promise.all(
                brands.map(async (brand) => {
                    const productCount =
                        await Product.countDocuments({
                            brandId:
                                brand.brandId,
                        });

                    return {
                        ...cleanDocument(brand),
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
 * GET SINGLE BRAND
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    requirePermission("brands.view"),
    async (req, res, next) => {
        try {
            const brand =
                await Brand.findOne({
                    brandId:
                        req.params.id,
                }).lean();

            if (!brand) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            /**
             * Get products belonging to this brand.
             */
            const products =
                await Product.find({
                    brandId:
                        brand.brandId,
                })
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            res.json({
                success: true,
                data: {
                    ...cleanDocument(brand),
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
 * CREATE BRAND
 * ============================================================================
 */

router.post(
    "/",
    authenticate,
    requirePermission("brands.manage"),
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
                        "Brand name is required",
                });

                return;
            }

            const normalizedName =
                String(name).trim();

            /**
             * Check duplicate brand.
             *
             * Case-insensitive, matching the previous
             * Prisma implementation.
             */
            const existing =
                await Brand.findOne({
                    name: {
                        $regex:
                            `^${escapeRegex(
                                normalizedName
                            )}$`,
                        $options: "i",
                    },
                }).lean();

            if (existing) {
                res.status(409).json({
                    success: false,
                    message:
                        "Brand already exists",
                });

                return;
            }

            /**
             * Create brand.
             */
            const brand =
                await Brand.create({
                    brandId:
                        generateMongoId(
                            "BRD"
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
                        "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} created. Status: ${brand.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create brand audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Brand created successfully",
                data: cleanDocument(
                    brand.toObject()
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE BRAND
 * ============================================================================
 */

router.put(
    "/:id",
    authenticate,
    requirePermission("brands.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing brand.
             */
            const existing =
                await Brand.findOne({
                    brandId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            const {
                name,
                description,
                status,
            } = req.body;

            /**
             * Check duplicate name when changed.
             */
            if (
                name !== undefined &&
                String(name).trim() !==
                existing.name
            ) {
                const normalizedName =
                    String(name).trim();

                const duplicate =
                    await Brand.findOne({
                        name: {
                            $regex:
                                `^${escapeRegex(
                                    normalizedName
                                )}$`,
                            $options: "i",
                        },

                        brandId: {
                            $ne:
                                req.params.id,
                        },
                    }).lean();

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "Brand already exists",
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
             * Update brand.
             */
            const brand =
                await Brand.findOneAndUpdate(
                    {
                        brandId:
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

            if (!brand) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
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
                        "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} updated. Status: ${brand.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create brand update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Brand updated successfully",
                data: cleanDocument(
                    brand
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * ARCHIVE BRAND
 * ============================================================================
 */

router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("brands.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing brand.
             */
            const existing =
                await Brand.findOne({
                    brandId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            /**
             * Archive brand.
             */
            const brand =
                await Brand.findOneAndUpdate(
                    {
                        brandId:
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

            if (!brand) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
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
                        "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create brand archive audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Brand archived successfully",
                data: cleanDocument(
                    brand
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE BRAND
 * ============================================================================
 */

router.delete(
    "/:id",
    authenticate,
    requirePermission("brands.manage"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing brand.
             */
            const existing =
                await Brand.findOne({
                    brandId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            /**
             * Delete brand.
             */
            await Brand.deleteOne({
                brandId:
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
                        "Brands",

                    recordId:
                        existing.brandId,

                    description:
                        `Brand ${existing.name} deleted. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create brand delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Brand deleted successfully",
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
