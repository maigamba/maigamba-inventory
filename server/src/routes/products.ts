import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

import { validate } from "../middleware/validate";

import {
    createProductSchema,
    updateProductSchema,
    productIdSchema,
    productListSchema,
} from "../validation/product.schema";

const router = Router();

/*
|--------------------------------------------------------------------------
| PRODUCTS ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| products.view
| products.create
| products.update
| products.delete
|
*/


// ============================================================================
// GET ALL PRODUCTS
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("products.view"),
    validate(productListSchema),
    async (req, res, next) => {
        try {
            const search = String(
                req.query.search ?? ""
            ).trim();

            const products =
                await prisma.product.findMany({
                    where: search
                        ? {
                              OR: [
                                  {
                                      productName: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                                  {
                                      sku: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                                  {
                                      productId: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                                  {
                                      model: {
                                          contains: search,
                                          mode: "insensitive",
                                      },
                                  },
                              ],
                          }
                        : undefined,

                    include: {
                        category: true,
                        brand: true,
                        supplier: true,
                    },

                    orderBy: {
                        createdAt: "desc",
                    },
                });

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// GET SINGLE PRODUCT
// ============================================================================

router.get(
    "/:id",
    authenticate,
    requirePermission("products.view"),
    validate(productIdSchema),
    async (req, res, next) => {
        try {
            const product =
                await prisma.product.findUnique({
                    where: {
                        productId: req.params.id,
                    },

                    include: {
                        category: true,
                        brand: true,
                        supplier: true,

                        stockMovements: {
                            orderBy: {
                                movementDate: "desc",
                            },
                        },
                    },
                });

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: "Product not found",
                });

                return;
            }

            res.json({
                success: true,
                data: product,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// CREATE PRODUCT
// ============================================================================

router.post(
    "/",
    authenticate,
    requirePermission("products.create"),
    validate(createProductSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                sku,
                productName,
                categoryId,
                brandId,
                model,
                serialNumber,
                description,
                quantity,
                reorderLevel,
                costPrice,
                sellingPrice,
                supplierId,
                location,
                status,
            } = req.body;

            // --------------------------------------------------------------
            // Duplicate SKU check
            // --------------------------------------------------------------

            const existingSku =
                await prisma.product.findUnique({
                    where: {
                        sku,
                    },
                });

            if (existingSku) {
                res.status(409).json({
                    success: false,
                    message:
                        "A product with this SKU already exists",
                });

                return;
            }

            // --------------------------------------------------------------
            // Create product
            // --------------------------------------------------------------

            const product =
                await prisma.product.create({
                    data: {
                        productId:
                            generateId("PRD"),

                        sku,

                        productName,

                        categoryId,

                        brandId,

                        model,

                        serialNumber,

                        description,

                        quantity,

                        reorderLevel,

                        costPrice,

                        sellingPrice,

                        supplierId,

                        location,

                        status,
                    },

                    include: {
                        category: true,
                        brand: true,
                        supplier: true,
                    },
                });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Products",

                    recordId:
                        product.productId,

                    description:
                        `Product created: ${product.productName} (${product.sku}). Selling price: ${product.sellingPrice}. Cost price: ${product.costPrice}.`,

                    ipAddress:
                        req.ip ||
                        req.socket.remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[PRODUCTS] CREATE AUDIT ERROR:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Product created successfully",
                data: product,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// UPDATE PRODUCT
// ============================================================================

router.put(
    "/:id",
    authenticate,
    requirePermission("products.update"),
    validate(updateProductSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            // --------------------------------------------------------------
            // Find existing product
            // --------------------------------------------------------------

            const product =
                await prisma.product.findUnique({
                    where: {
                        productId: req.params.id,
                    },
                });

            if (!product) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            const {
                sku,
                productName,
                categoryId,
                brandId,
                model,
                serialNumber,
                description,
                quantity,
                reorderLevel,
                costPrice,
                sellingPrice,
                supplierId,
                location,
                status,
            } = req.body;

            // --------------------------------------------------------------
            // Check duplicate SKU
            // --------------------------------------------------------------

            if (
                sku !== undefined &&
                sku !== product.sku
            ) {
                const existingSku =
                    await prisma.product.findUnique({
                        where: {
                            sku,
                        },
                    });

                if (existingSku) {
                    res.status(409).json({
                        success: false,
                        message:
                            "A product with this SKU already exists",
                    });

                    return;
                }
            }

            // --------------------------------------------------------------
            // Detect price changes
            // --------------------------------------------------------------

            const oldCostPrice =
                Number(product.costPrice);

            const oldSellingPrice =
                Number(product.sellingPrice);

            const newCostPrice =
                costPrice !== undefined
                    ? Number(costPrice)
                    : oldCostPrice;

            const newSellingPrice =
                sellingPrice !== undefined
                    ? Number(sellingPrice)
                    : oldSellingPrice;

            const costPriceChanged =
                newCostPrice !== oldCostPrice;

            const sellingPriceChanged =
                newSellingPrice !==
                oldSellingPrice;

            // --------------------------------------------------------------
            // Update product
            // --------------------------------------------------------------

            const updatedProduct =
                await prisma.product.update({
                    where: {
                        productId: req.params.id,
                    },

                    data: {
                        ...(sku !== undefined && {
                            sku,
                        }),

                        ...(productName !== undefined && {
                            productName,
                        }),

                        ...(categoryId !== undefined && {
                            categoryId,
                        }),

                        ...(brandId !== undefined && {
                            brandId,
                        }),

                        ...(model !== undefined && {
                            model,
                        }),

                        ...(serialNumber !== undefined && {
                            serialNumber,
                        }),

                        ...(description !== undefined && {
                            description,
                        }),

                        ...(quantity !== undefined && {
                            quantity,
                        }),

                        ...(reorderLevel !== undefined && {
                            reorderLevel,
                        }),

                        ...(costPrice !== undefined && {
                            costPrice: newCostPrice,
                        }),

                        ...(sellingPrice !== undefined && {
                            sellingPrice: newSellingPrice,
                        }),

                        ...(supplierId !== undefined && {
                            supplierId,
                        }),

                        ...(location !== undefined && {
                            location,
                        }),

                        ...(status !== undefined && {
                            status,
                        }),
                    },

                    include: {
                        category: true,
                        brand: true,
                        supplier: true,
                    },
                });

            // --------------------------------------------------------------
            // Audit: price change
            // --------------------------------------------------------------

            if (
                costPriceChanged ||
                sellingPriceChanged
            ) {
                try {
                    const priceChanges: string[] =
                        [];

                    if (costPriceChanged) {
                        priceChanges.push(
                            `cost price: ${oldCostPrice} -> ${newCostPrice}`
                        );
                    }

                    if (sellingPriceChanged) {
                        priceChanges.push(
                            `selling price: ${oldSellingPrice} -> ${newSellingPrice}`
                        );
                    }

                    await createAuditLog({
                        userId:
                            req.user?.userId,

                        action:
                            "PRICE_CHANGE",

                        module:
                            "Products",

                        recordId:
                            updatedProduct.productId,

                        description:
                            `Price changed for ${updatedProduct.productName} (${updatedProduct.sku}): ${priceChanges.join(
                                ", "
                            )}.`,

                        ipAddress:
                            req.ip ||
                            req.socket
                                .remoteAddress ||
                            undefined,
                    });
                } catch (auditError) {
                    console.error(
                        "[PRODUCTS] PRICE AUDIT ERROR:",
                        auditError
                    );
                }
            }

            // --------------------------------------------------------------
            // Audit: general update
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Products",

                    recordId:
                        updatedProduct.productId,

                    description:
                        `Product updated: ${updatedProduct.productName} (${updatedProduct.sku}).`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[PRODUCTS] UPDATE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Product updated successfully",
                data: updatedProduct,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// ARCHIVE PRODUCT
// ============================================================================

router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("products.update"),
    validate(productIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const product =
                await prisma.product.findUnique({
                    where: {
                        productId: req.params.id,
                    },
                });

            if (!product) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Archive product
            // --------------------------------------------------------------

            const archivedProduct =
                await prisma.product.update({
                    where: {
                        productId: req.params.id,
                    },

                    data: {
                        status: "Archived",
                    },
                });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "ARCHIVE",

                    module:
                        "Products",

                    recordId:
                        archivedProduct.productId,

                    description:
                        `Product archived: ${archivedProduct.productName} (${archivedProduct.sku}).`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[PRODUCTS] ARCHIVE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Product archived successfully",
                data: archivedProduct,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// DELETE PRODUCT
// ============================================================================

router.delete(
    "/:id",
    authenticate,
    requirePermission("products.delete"),
    validate(productIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const product =
                await prisma.product.findUnique({
                    where: {
                        productId: req.params.id,
                    },
                });

            if (!product) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            // --------------------------------------------------------------
            // Delete product
            // --------------------------------------------------------------

            await prisma.product.delete({
                where: {
                    productId: req.params.id,
                },
            });

            // --------------------------------------------------------------
            // Audit log
            // --------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DELETE",

                    module:
                        "Products",

                    recordId:
                        product.productId,

                    description:
                        `Product deleted: ${product.productName} (${product.sku}).`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[PRODUCTS] DELETE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Product deleted successfully",
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