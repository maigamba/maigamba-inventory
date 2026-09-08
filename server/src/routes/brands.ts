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
| BRAND ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| brands.view
| brands.manage
|
*/

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
                await prisma.brand.findMany({
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

            const data = brands.map(
                (brand) => ({
                    ...brand,

                    productCount:
                        brand.products.length,

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
                await prisma.brand.findUnique({
                    where: {
                        brandId:
                            req.params.id,
                    },

                    include: {
                        products: true,
                    },
                });

            if (!brand) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            res.json({
                success: true,
                data: brand,
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

            // --------------------------------------------------------------
            // Validate name
            // --------------------------------------------------------------

            if (!name) {
                res.status(400).json({
                    success: false,
                    message:
                        "Brand name is required",
                });

                return;
            }

            // --------------------------------------------------------------
            // Check duplicate brand
            // --------------------------------------------------------------

            const existing =
                await prisma.brand.findFirst({
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
                        "Brand already exists",
                });

                return;
            }

            // --------------------------------------------------------------
            // Create brand
            // --------------------------------------------------------------

            const brand =
                await prisma.brand.create({
                    data: {
                        brandId:
                            generateId("BRD"),

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

                    module: "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} created. Status: ${brand.status}.`,

                    ipAddress:
                        req.ip,
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
                data: brand,
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
            // --------------------------------------------------------------
            // Find existing brand
            // --------------------------------------------------------------

            const existing =
                await prisma.brand.findUnique({
                    where: {
                        brandId:
                            req.params.id,
                    },
                });

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

            // --------------------------------------------------------------
            // Check duplicate name when changed
            // --------------------------------------------------------------

            if (
                name !== undefined &&
                name.trim() !== existing.name
            ) {
                const duplicate =
                    await prisma.brand.findFirst({
                        where: {
                            name: {
                                equals:
                                    name.trim(),
                                mode:
                                    "insensitive",
                            },

                            NOT: {
                                brandId:
                                    req.params.id,
                            },
                        },
                    });

                if (duplicate) {
                    res.status(409).json({
                        success: false,
                        message:
                            "Brand already exists",
                    });

                    return;
                }
            }

            // --------------------------------------------------------------
            // Update brand
            // --------------------------------------------------------------

            const brand =
                await prisma.brand.update({
                    where: {
                        brandId:
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

                    module: "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} updated. Status: ${brand.status}.`,

                    ipAddress:
                        req.ip,
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
                data: brand,
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
            // --------------------------------------------------------------
            // Find existing brand
            // --------------------------------------------------------------

            const existing =
                await prisma.brand.findUnique({
                    where: {
                        brandId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Archive brand
            // --------------------------------------------------------------

            const brand =
                await prisma.brand.update({
                    where: {
                        brandId:
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

                    module: "Brands",

                    recordId:
                        brand.brandId,

                    description:
                        `Brand ${brand.name} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip,
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
                data: brand,
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
            // --------------------------------------------------------------
            // Find existing brand
            // --------------------------------------------------------------

            const existing =
                await prisma.brand.findUnique({
                    where: {
                        brandId:
                            req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Brand not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete brand
            // --------------------------------------------------------------

            await prisma.brand.delete({
                where: {
                    brandId:
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

                    module: "Brands",

                    recordId:
                        existing.brandId,

                    description:
                        `Brand ${existing.name} deleted. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip,
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