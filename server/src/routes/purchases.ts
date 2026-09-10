import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Purchase from "../models/Purchase.js";
import PurchaseItem from "../models/PurchaseItem.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import StockMovement from "../models/StockMovement.js";

import { generateMongoId } from "../utils/mongoId.js";
import { createAuditLog } from "../services/audit.service.js";

import { validate } from "../middleware/validate.js";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| PURCHASE ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| purchases.view
| purchases.create
| purchases.update
| purchases.delete
|
*/

/**
 * ============================================================================
 * VALIDATION
 * ============================================================================
 */

const purchaseItemSchema = z.object({
    productId: z
        .string()
        .trim()
        .min(1, "Product ID is required")
        .max(100),

    quantity: z.coerce
        .number()
        .finite()
        .int()
        .min(1)
        .max(1000000),

    unitCost: z.coerce
        .number()
        .finite()
        .min(0)
        .max(100000000000),
});

const createPurchaseSchema = z.object({
    body: z.object({
        supplierId: z
            .string()
            .trim()
            .min(
                1,
                "Supplier ID is required"
            )
            .max(100),

        SupplierID: z
            .string()
            .trim()
            .max(100)
            .optional(),

        amountPaid: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000)
            .optional(),

        AmountPaid: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000)
            .optional(),

        paymentMethod: z
            .string()
            .trim()
            .min(1)
            .max(50)
            .optional(),

        PaymentMethod: z
            .string()
            .trim()
            .min(1)
            .max(50)
            .optional(),

        createdBy: z
            .string()
            .trim()
            .max(100)
            .optional(),

        CreatedBy: z
            .string()
            .trim()
            .max(100)
            .optional(),

        items: z
            .array(purchaseItemSchema)
            .min(
                1,
                "At least one purchase item is required"
            )
            .max(500),
    }),
});

const purchaseIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(
                1,
                "Purchase ID is required"
            )
            .max(100),
    }),
});

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

/**
 * Remove MongoDB internal fields.
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
 * GET ALL PURCHASES
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("purchases.view"),
    async (_req, res, next) => {
        try {
            const purchases =
                await Purchase.find({})
                    .sort({
                        purchaseDate: -1,
                    })
                    .lean();

            /**
             * Collect supplier IDs.
             */
            const supplierIds = [
                ...new Set(
                    purchases
                        .map(
                            (purchase: any) =>
                                purchase.supplierId
                        )
                        .filter(Boolean)
                        .map(String)
                ),
            ];

            /**
             * Collect creator IDs.
             */
            const userIds = [
                ...new Set(
                    purchases
                        .map(
                            (purchase: any) =>
                                purchase.createdBy
                        )
                        .filter(Boolean)
                        .map(String)
                ),
            ];

            /**
             * Collect purchase IDs.
             */
            const purchaseIds =
                purchases.map(
                    (purchase: any) =>
                        purchase.purchaseId
                );

            /**
             * Load related data in parallel.
             */
            const [
                suppliers,
                users,
                purchaseItems,
            ] = await Promise.all([
                supplierIds.length
                    ? Supplier.find({
                        supplierId: {
                            $in: supplierIds,
                        },
                    }).lean()
                    : [],

                userIds.length
                    ? User.find({
                        userId: {
                            $in: userIds,
                        },
                    })
                        .select(
                            "userId fullName email role status"
                        )
                        .lean()
                    : [],

                purchaseIds.length
                    ? PurchaseItem.find({
                        purchaseId: {
                            $in: purchaseIds,
                        },
                    }).lean()
                    : [],
            ]);

            /**
             * Collect product IDs from purchase items.
             */
            const productIds = [
                ...new Set(
                    purchaseItems
                        .map(
                            (item: any) =>
                                item.productId
                        )
                        .filter(Boolean)
                        .map(String)
                ),
            ];

            const products =
                productIds.length
                    ? await Product.find({
                        productId: {
                            $in: productIds,
                        },
                    }).lean()
                    : [];

            /**
             * Maps.
             *
             * Explicit tuple typing prevents
             * TypeScript Map errors.
             */
            const supplierMap = new Map<
                string,
                any
            >(
                suppliers.map(
                    (supplier: any) =>
                        [
                            String(
                                supplier.supplierId
                            ),
                            cleanDocument(
                                supplier
                            ),
                        ] as [
                            string,
                            any
                        ]
                )
            );

            const userMap = new Map<
                string,
                any
            >(
                users.map(
                    (user: any) =>
                        [
                            String(
                                user.userId
                            ),
                            cleanDocument(
                                user
                            ),
                        ] as [
                            string,
                            any
                        ]
                )
            );

            const productMap = new Map<
                string,
                any
            >(
                products.map(
                    (product: any) =>
                        [
                            String(
                                product.productId
                            ),
                            cleanDocument(
                                product
                            ),
                        ] as [
                            string,
                            any
                        ]
                )
            );

            /**
             * Group purchase items.
             */
            const itemsByPurchase =
                new Map<
                    string,
                    any[]
                >();

            for (
                const item of purchaseItems
            ) {
                const existing =
                    itemsByPurchase.get(
                        item.purchaseId
                    ) || [];

                existing.push({
                    ...cleanDocument(
                        item
                    ),

                    product:
                        productMap.get(
                            String(
                                item.productId
                            )
                        ) || null,
                });

                itemsByPurchase.set(
                    item.purchaseId,
                    existing
                );
            }

            /**
             * Build response.
             */
            const result =
                purchases.map(
                    (purchase: any) => ({
                        ...cleanDocument(
                            purchase
                        ),

                        supplier:
                            purchase.supplierId
                                ? supplierMap.get(
                                    String(
                                        purchase.supplierId
                                    )
                                ) || null
                                : null,

                        creator:
                            purchase.createdBy
                                ? userMap.get(
                                    String(
                                        purchase.createdBy
                                    )
                                ) || null
                                : null,

                        items:
                            itemsByPurchase.get(
                                purchase.purchaseId
                            ) || [],
                    })
                );

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE PURCHASE
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    requirePermission("purchases.view"),
    validate(purchaseIdSchema),
    async (req, res, next) => {
        try {
            const purchase =
                await Purchase.findOne({
                    purchaseId:
                        req.params.id,
                }).lean();

            if (!purchase) {
                res.status(404).json({
                    success: false,
                    message:
                        "Purchase not found",
                });

                return;
            }

            /**
             * Load related records.
             */
            const [
                supplier,
                creator,
                purchaseItems,
            ] = await Promise.all([
                Supplier.findOne({
                    supplierId:
                        purchase.supplierId,
                }).lean(),

                purchase.createdBy
                    ? User.findOne({
                        userId:
                            purchase.createdBy,
                    })
                        .select(
                            "userId fullName email role status"
                        )
                        .lean()
                    : null,

                PurchaseItem.find({
                    purchaseId:
                        purchase.purchaseId,
                }).lean(),
            ]);

            /**
             * Resolve products.
             */
            const productIds = [
                ...new Set(
                    purchaseItems
                        .map(
                            (item: any) =>
                                item.productId
                        )
                        .filter(Boolean)
                        .map(String)
                ),
            ];

            const products =
                productIds.length
                    ? await Product.find({
                        productId: {
                            $in: productIds,
                        },
                    }).lean()
                    : [];

            const productMap = new Map<
                string,
                any
            >(
                products.map(
                    (product: any) =>
                        [
                            String(
                                product.productId
                            ),
                            cleanDocument(
                                product
                            ),
                        ] as [
                            string,
                            any
                        ]
                )
            );

            const normalizedItems =
                purchaseItems.map(
                    (item: any) => ({
                        ...cleanDocument(
                            item
                        ),

                        product:
                            productMap.get(
                                String(
                                    item.productId
                                )
                            ) || null,
                    })
                );

            const result = {
                ...cleanDocument(
                    purchase
                ),

                supplier:
                    cleanDocument(
                        supplier
                    ) || null,

                creator:
                    cleanDocument(
                        creator
                    ) || null,

                items:
                    normalizedItems,
            };

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE PURCHASE
 * ============================================================================
 */

router.post(
    "/",
    authenticate,
    requirePermission("purchases.create"),
    validate(createPurchaseSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        let session:
            | mongoose.ClientSession
            | undefined;

        try {
            const body =
                req.body ?? {};

            /**
             * ---------------------------------------------------------------
             * Supplier
             * ---------------------------------------------------------------
             */

            const supplierId =
                String(
                    body.supplierId ??
                    body.SupplierID ??
                    ""
                ).trim();

            if (!supplierId) {
                res.status(400).json({
                    success: false,
                    message:
                        "supplierId is required.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Items
             * ---------------------------------------------------------------
             */

            const rawItems =
                body.items;

            if (
                !Array.isArray(
                    rawItems
                ) ||
                rawItems.length === 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "At least one purchase item is required.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Payment
             * ---------------------------------------------------------------
             */

            const rawAmountPaid =
                body.amountPaid ??
                body.AmountPaid ??
                0;

            const parsedAmountPaid =
                Number(
                    rawAmountPaid
                );

            if (
                !Number.isFinite(
                    parsedAmountPaid
                ) ||
                parsedAmountPaid < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "amountPaid must be a valid number.",
                });

                return;
            }

            const amountPaid =
                parsedAmountPaid;

            const paymentMethod =
                String(
                    body.paymentMethod ??
                    body.PaymentMethod ??
                    "Bank Transfer"
                ).trim() ||
                "Bank Transfer";

            /**
             * ---------------------------------------------------------------
             * Normalize items
             * ---------------------------------------------------------------
             */

            const items =
                rawItems.map(
                    (
                        item: any,
                        index: number
                    ) => ({
                        productId:
                            String(
                                item?.productId ??
                                item?.ProductID ??
                                ""
                            ).trim(),

                        quantity:
                            Number(
                                item?.quantity ??
                                item?.Quantity ??
                                0
                            ),

                        unitCost:
                            Number(
                                item?.unitCost ??
                                item?.UnitCost ??
                                item?.costPrice ??
                                item?.CostPrice ??
                                0
                            ),

                        index,
                    })
                );

            /**
             * ---------------------------------------------------------------
             * Validate items
             * ---------------------------------------------------------------
             */

            for (
                const item of items
            ) {
                if (!item.productId) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Purchase item ${item.index + 1} is missing productId.`,
                    });

                    return;
                }

                if (
                    !Number.isFinite(
                        item.quantity
                    ) ||
                    item.quantity <= 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Invalid quantity for purchase item ${item.index + 1}.`,
                    });

                    return;
                }

                if (
                    !Number.isFinite(
                        item.unitCost
                    ) ||
                    item.unitCost < 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Invalid unit cost for purchase item ${item.index + 1}.`,
                    });

                    return;
                }
            }

            /**
             * ---------------------------------------------------------------
             * Resolve authenticated user
             * ---------------------------------------------------------------
             */

            const authenticatedUserId =
                String(
                    req.user?.userId ??
                    req.user?.id ??
                    ""
                ).trim();

            const bodyCreatedBy =
                String(
                    body.createdBy ??
                    body.CreatedBy ??
                    ""
                ).trim();

            const staffUserId =
                authenticatedUserId ||
                bodyCreatedBy;

            if (!staffUserId) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authenticated staff user could not be resolved.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Verify staff account
             * ---------------------------------------------------------------
             */

            const staffUser =
                await User.findOne({
                    userId:
                        staffUserId,
                }).lean();

            if (!staffUser) {
                res.status(400).json({
                    success: false,
                    message:
                        "The authenticated staff account was not found in the database.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Verify active account
             * ---------------------------------------------------------------
             */

            if (
                String(
                    staffUser.status
                ).toLowerCase() !==
                "active"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "The staff account is not active.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Validate supplier
             * ---------------------------------------------------------------
             */

            const supplier =
                await Supplier.findOne({
                    supplierId,
                }).lean();

            if (!supplier) {
                res.status(400).json({
                    success: false,
                    message:
                        `Supplier not found: ${supplierId}`,
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * MongoDB transaction
             * ---------------------------------------------------------------
             */

            session =
                await mongoose.startSession();

            let createdPurchase: any;

            await session.withTransaction(
                async () => {
                    let subtotal = 0;

                    const purchaseId =
                        generateMongoId(
                            "PUR"
                        );

                    /**
                     * Generate invoice number.
                     */
                    const invoiceNumber =
                        `PUR-${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 6)
                            .toUpperCase()}`;

                    const purchaseItemsToCreate: Array<{
                        purchaseItemId: string;
                        purchaseId: string;
                        productId: string;
                        quantity: number;
                        unitCost: number;
                        totalCost: number;
                    }> = [];

                    /**
                     * -------------------------------------------------------
                     * Calculate subtotal
                     * -------------------------------------------------------
                     */

                    for (
                        const item of items
                    ) {
                        const product =
                            await Product.findOne(
                                {
                                    productId:
                                        item.productId,
                                }
                            )
                                .session(
                                    session!
                                )
                                .lean();

                        if (!product) {
                            throw new Error(
                                `Product not found: ${item.productId}`
                            );
                        }

                        const totalCost =
                            item.quantity *
                            item.unitCost;

                        subtotal +=
                            totalCost;

                        purchaseItemsToCreate.push(
                            {
                                purchaseItemId:
                                    generateMongoId(
                                        "PURITEM"
                                    ),

                                purchaseId,

                                productId:
                                    product.productId,

                                quantity:
                                    item.quantity,

                                unitCost:
                                    item.unitCost,

                                totalCost,
                            }
                        );
                    }

                    /**
                     * -------------------------------------------------------
                     * Calculate totals
                     * -------------------------------------------------------
                     */

                    const computedTotal =
                        subtotal;

                    const computedBalance =
                        Math.max(
                            computedTotal -
                            amountPaid,
                            0
                        );

                    const paymentStatus =
                        amountPaid >=
                            computedTotal
                            ? "Paid"
                            : amountPaid >
                                0
                                ? "Partial"
                                : "Unpaid";

                    /**
                     * -------------------------------------------------------
                     * Create purchase
                     * -------------------------------------------------------
                     */

                    const purchase =
                        await Purchase.create(
                            [
                                {
                                    purchaseId,

                                    invoiceNumber,

                                    supplierId:
                                        supplier.supplierId,

                                    purchaseDate:
                                        new Date(),

                                    subtotal,

                                    tax: 0,

                                    totalAmount:
                                        computedTotal,

                                    amountPaid,

                                    balance:
                                        computedBalance,

                                    paymentMethod,

                                    paymentStatus,

                                    purchaseStatus:
                                        "Completed",

                                    createdBy:
                                        staffUser.userId,
                                },
                            ],
                            {
                                session,
                            }
                        );

                    createdPurchase =
                        purchase[0];

                    /**
                     * -------------------------------------------------------
                     * Create purchase items
                     * -------------------------------------------------------
                     */

                    await PurchaseItem.insertMany(
                        purchaseItemsToCreate,
                        {
                            session,
                        }
                    );

                    /**
                     * -------------------------------------------------------
                     * Update stock and create movements
                     * -------------------------------------------------------
                     */

                    for (
                        const item of purchaseItemsToCreate
                    ) {
                        const product =
                            await Product.findOne(
                                {
                                    productId:
                                        item.productId,
                                }
                            ).session(
                                session!
                            );

                        if (!product) {
                            throw new Error(
                                `Product not found during stock update: ${item.productId}`
                            );
                        }

                        const previousQuantity =
                            product.quantity;

                        const newQuantity =
                            previousQuantity +
                            item.quantity;

                        /**
                         * Update product quantity.
                         *
                         * We intentionally only update
                         * quantity here. Product price,
                         * supplier and other information
                         * remain unchanged.
                         */
                        await Product.updateOne(
                            {
                                productId:
                                    item.productId,
                            },
                            {
                                $set: {
                                    quantity:
                                        newQuantity,
                                },
                            },
                            {
                                session,
                            }
                        );

                        /**
                         * Create stock movement.
                         */
                        await StockMovement.create(
                            [
                                {
                                    movementId:
                                        generateMongoId(
                                            "MOV"
                                        ),

                                    productId:
                                        item.productId,

                                    movementType:
                                        "Purchase",

                                    quantity:
                                        item.quantity,

                                    previousQuantity,

                                    newQuantity,

                                    referenceId:
                                        purchaseId,

                                    reason:
                                        `Stock received from ${supplier.supplierName}`,

                                    createdBy:
                                        staffUser.userId,

                                    movementDate:
                                        new Date(),
                                },
                            ],
                            {
                                session,
                            }
                        );
                    }
                }
            );

            /**
             * End transaction session.
             */
            await session.endSession();
            session =
                undefined;

            /**
             * ---------------------------------------------------------------
             * Reload complete purchase
             * ---------------------------------------------------------------
             */

            const resultPurchase =
                await Purchase.findOne({
                    purchaseId:
                        createdPurchase.purchaseId,
                }).lean();

            if (!resultPurchase) {
                throw new Error(
                    "Purchase was created but could not be retrieved."
                );
            }

            const [
                resultSupplier,
                resultCreator,
                resultItems,
            ] = await Promise.all([
                Supplier.findOne({
                    supplierId:
                        resultPurchase.supplierId,
                }).lean(),

                User.findOne({
                    userId:
                        resultPurchase.createdBy,
                })
                    .select(
                        "userId fullName email role status"
                    )
                    .lean(),

                PurchaseItem.find({
                    purchaseId:
                        resultPurchase.purchaseId,
                }).lean(),
            ]);

            /**
             * Resolve products.
             */
            const resultProductIds = [
                ...new Set(
                    resultItems
                        .map(
                            (item: any) =>
                                item.productId
                        )
                        .filter(Boolean)
                        .map(String)
                ),
            ];

            const resultProducts =
                resultProductIds.length
                    ? await Product.find({
                        productId: {
                            $in:
                                resultProductIds,
                        },
                    }).lean()
                    : [];

            const resultProductMap =
                new Map<
                    string,
                    any
                >(
                    resultProducts.map(
                        (product: any) =>
                            [
                                String(
                                    product.productId
                                ),
                                cleanDocument(
                                    product
                                ),
                            ] as [
                                string,
                                any
                            ]
                    )
                );

            const normalizedItems =
                resultItems.map(
                    (item: any) => ({
                        ...cleanDocument(
                            item
                        ),

                        product:
                            resultProductMap.get(
                                String(
                                    item.productId
                                )
                            ) || null,
                    })
                );

            const result = {
                ...cleanDocument(
                    resultPurchase
                ),

                supplier:
                    cleanDocument(
                        resultSupplier
                    ) || null,

                creator:
                    cleanDocument(
                        resultCreator
                    ) || null,

                items:
                    normalizedItems,
            };

            /**
             * ---------------------------------------------------------------
             * Console log
             * ---------------------------------------------------------------
             */

            console.info(
                `[PURCHASES] Purchase created: ${result.purchaseId} / ${result.invoiceNumber} — Supplier: ${supplier.supplierName}`
            );

            /**
             * ---------------------------------------------------------------
             * Audit log
             * ---------------------------------------------------------------
             */

            try {
                await createAuditLog({
                    userId:
                        req.user?.userId ??
                        staffUser.userId,

                    action:
                        "PURCHASE",

                    module:
                        "Purchases",

                    recordId:
                        result.purchaseId,

                    description:
                        `Purchase completed: ${result.invoiceNumber}, supplier ${supplier.supplierName}, total ${result.totalAmount}, paid ${result.amountPaid}, balance ${result.balance}, payment method ${paymentMethod}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                /**
                 * Audit failure must never turn
                 * a successful purchase into a
                 * failed response.
                 */
                console.error(
                    "[PURCHASES] AUDIT ERROR:",
                    auditError
                );
            }

            /**
             * ---------------------------------------------------------------
             * Success response
             * ---------------------------------------------------------------
             */

            res.status(201).json({
                success: true,

                message:
                    "Purchase order created and stock updated successfully.",

                data: result,
            });
        } catch (error) {
            /**
             * Clean up MongoDB transaction
             * if an error occurs.
             */
            if (session) {
                try {
                    if (
                        session.inTransaction()
                    ) {
                        await session.abortTransaction();
                    }
                } catch {
                    // Ignore transaction cleanup errors.
                }

                try {
                    await session.endSession();
                } catch {
                    // Ignore session cleanup errors.
                }
            }

            console.error(
                "[PURCHASES] CREATE PURCHASE ERROR:",
                error
            );

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
