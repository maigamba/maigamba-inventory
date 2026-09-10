import { Router } from "express";
import Product from "../models/Product";
import Category from "../models/Category";
import Brand from "../models/Brand";
import Supplier from "../models/Supplier";
import StockMovement from "../models/StockMovement";
import { generateMongoId } from "../utils/mongoId";
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
| MongoDB / Mongoose version
|
| Permissions:
|
| products.view
| products.create
| products.update
| products.delete
|
*/

/**
 * Attach category, brand and supplier information to a product.
 *
 * Prisma previously handled these relational includes automatically.
 * MongoDB stores the IDs directly, so we resolve the related documents
 * here while keeping the response shape familiar to the frontend.
 */
async function enrichProduct(product: any) {
    if (!product) {
        return null;
    }

    const [
        category,
        brand,
        supplier,
    ] = await Promise.all([
        product.categoryId
            ? Category.findOne({
                categoryId: product.categoryId,
            }).lean()
            : null,

        product.brandId
            ? Brand.findOne({
                brandId: product.brandId,
            }).lean()
            : null,

        product.supplierId
            ? Supplier.findOne({
                supplierId: product.supplierId,
            }).lean()
            : null,
    ]);

    return {
        ...product,
        category,
        brand,
        supplier,
    };
}

/**
 * Convert a MongoDB document into a clean JSON object.
 *
 * The frontend should receive the application's productId rather
 * than depending on MongoDB's internal _id.
 */
function cleanProduct(product: any) {
    if (!product) {
        return product;
    }

    const {
        _id,
        __v,
        ...data
    } = product;

    return data;
}

/**
 * ============================================================================
 * GET ALL PRODUCTS
 * ============================================================================
 */

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

            let query: any = {};

            if (search) {
                const regex = new RegExp(
                    search.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    ),
                    "i"
                );

                query = {
                    $or: [
                        {
                            productName: regex,
                        },
                        {
                            sku: regex,
                        },
                        {
                            productId: regex,
                        },
                        {
                            model: regex,
                        },
                    ],
                };
            }

            const products =
                await Product.find(query)
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            const enrichedProducts =
                await Promise.all(
                    products.map(async (product) => {
                        const enriched =
                            await enrichProduct(
                                product
                            );

                        return cleanProduct(
                            enriched
                        );
                    })
                );

            res.json({
                success: true,
                data: enrichedProducts,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE PRODUCT
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    requirePermission("products.view"),
    validate(productIdSchema),
    async (req, res, next) => {
        try {
            const product =
                await Product.findOne({
                    productId: req.params.id,
                }).lean();

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: "Product not found",
                });

                return;
            }

            const [
                enrichedProduct,
                stockMovements,
            ] = await Promise.all([
                enrichProduct(product),

                StockMovement.find({
                    productId:
                        product.productId,
                })
                    .sort({
                        movementDate: -1,
                    })
                    .lean(),
            ]);

            const responseProduct = {
                ...enrichedProduct,
                stockMovements:
                    stockMovements.map(
                        cleanProduct
                    ),
            };

            res.json({
                success: true,
                data: cleanProduct(
                    responseProduct
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE PRODUCT
 * ============================================================================
 */

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

            /**
             * Duplicate SKU check
             */
            const existingSku =
                await Product.findOne({
                    sku,
                }).lean();

            if (existingSku) {
                res.status(409).json({
                    success: false,
                    message:
                        "A product with this SKU already exists",
                });

                return;
            }

            /**
             * Create product
             */
            const product =
                await Product.create({
                    productId:
                        generateMongoId("PRD"),

                    sku,

                    productName,

                    categoryId,

                    brandId,

                    model,

                    serialNumber,

                    description,

                    quantity,

                    reorderLevel,

                    costPrice:
                        Number(costPrice),

                    sellingPrice:
                        Number(sellingPrice),

                    supplierId,

                    location,

                    status,
                });

            /**
             * Resolve related documents.
             */
            const enrichedProduct =
                await enrichProduct(
                    product.toObject()
                );

            /**
             * Audit log
             */
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
                        req.socket
                            .remoteAddress ||
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
                data: cleanProduct(
                    enrichedProduct
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE PRODUCT
 * ============================================================================
 */

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
            /**
             * Find existing product.
             */
            const product =
                await Product.findOne({
                    productId: req.params.id,
                }).lean();

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

            /**
             * Check duplicate SKU.
             */
            if (
                sku !== undefined &&
                sku !== product.sku
            ) {
                const existingSku =
                    await Product.findOne({
                        sku,
                        productId: {
                            $ne:
                                product.productId,
                        },
                    }).lean();

                if (existingSku) {
                    res.status(409).json({
                        success: false,
                        message:
                            "A product with this SKU already exists",
                    });

                    return;
                }
            }

            /**
             * Detect price changes.
             */
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
                newCostPrice !==
                oldCostPrice;

            const sellingPriceChanged =
                newSellingPrice !==
                oldSellingPrice;

            /**
             * Build update object.
             */
            const updateData: Record<
                string,
                unknown
            > = {};

            if (sku !== undefined) {
                updateData.sku = sku;
            }

            if (productName !== undefined) {
                updateData.productName =
                    productName;
            }

            if (categoryId !== undefined) {
                updateData.categoryId =
                    categoryId;
            }

            if (brandId !== undefined) {
                updateData.brandId =
                    brandId;
            }

            if (model !== undefined) {
                updateData.model = model;
            }

            if (serialNumber !== undefined) {
                updateData.serialNumber =
                    serialNumber;
            }

            if (description !== undefined) {
                updateData.description =
                    description;
            }

            if (quantity !== undefined) {
                updateData.quantity =
                    Number(quantity);
            }

            if (reorderLevel !== undefined) {
                updateData.reorderLevel =
                    Number(reorderLevel);
            }

            if (costPrice !== undefined) {
                updateData.costPrice =
                    newCostPrice;
            }

            if (sellingPrice !== undefined) {
                updateData.sellingPrice =
                    newSellingPrice;
            }

            if (supplierId !== undefined) {
                updateData.supplierId =
                    supplierId;
            }

            if (location !== undefined) {
                updateData.location =
                    location;
            }

            if (status !== undefined) {
                updateData.status =
                    status;
            }

            /**
             * Update product.
             */
            const updatedProduct =
                await Product.findOneAndUpdate(
                    {
                        productId:
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

            if (!updatedProduct) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            /**
             * Resolve related documents.
             */
            const enrichedProduct =
                await enrichProduct(
                    updatedProduct
                );

            /**
             * Audit: price change.
             */
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

            /**
             * Audit: general update.
             */
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
                data: cleanProduct(
                    enrichedProduct
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * ARCHIVE PRODUCT
 * ============================================================================
 */

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
                await Product.findOne({
                    productId: req.params.id,
                }).lean();

            if (!product) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            /**
             * Archive product.
             */
            const archivedProduct =
                await Product.findOneAndUpdate(
                    {
                        productId:
                            req.params.id,
                    },
                    {
                        $set: {
                            status: "Archived",
                        },
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!archivedProduct) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            /**
             * Resolve related documents.
             */
            const enrichedProduct =
                await enrichProduct(
                    archivedProduct
                );

            /**
             * Audit log.
             */
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
                data: cleanProduct(
                    enrichedProduct
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE PRODUCT
 * ============================================================================
 */

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
                await Product.findOne({
                    productId: req.params.id,
                }).lean();

            if (!product) {
                res.status(404).json({
                    success: false,
                    message:
                        "Product not found",
                });

                return;
            }

            /**
             * Delete product.
             */
            await Product.deleteOne({
                productId:
                    req.params.id,
            });

            /**
             * Audit log.
             */
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

/**
 * ============================================================================
 * EXPORT ROUTER
 * ============================================================================
 */

export default router;
