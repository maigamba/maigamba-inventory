import { Router } from "express";
import { prisma } from "../config/database";
import {
    generateId,
    generatePurchaseNumber,
} from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import { validate } from "../middleware/validate";
import { z } from "zod";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

const purchaseItemSchema = z.object({
    productId: z.string().trim().min(1, "Product ID is required").max(100),
    quantity: z.coerce.number().finite().int().min(1).max(1000000),
    unitCost: z.coerce.number().finite().min(0).max(100000000000),
});

const createPurchaseSchema = z.object({
    body: z.object({
        supplierId: z.string().trim().min(1, "Supplier ID is required").max(100),
        SupplierID: z.string().trim().max(100).optional(),
        amountPaid: z.coerce.number().finite().min(0).max(100000000000).optional(),
        AmountPaid: z.coerce.number().finite().min(0).max(100000000000).optional(),
        paymentMethod: z.string().trim().min(1).max(50).optional(),
        PaymentMethod: z.string().trim().min(1).max(50).optional(),
        createdBy: z.string().trim().max(100).optional(),
        CreatedBy: z.string().trim().max(100).optional(),
        items: z.array(purchaseItemSchema).min(1, "At least one purchase item is required").max(500),
    }),
});

const purchaseIdSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Purchase ID is required").max(100),
    }),
});


/*
|--------------------------------------------------------------------------
| PURCHASE ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| purchases.view
| purchases.create
| purchases.update
| purchases.delete
|
*/


// ============================================================================
// GET ALL PURCHASES
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("purchases.view"),
    async (_req, res, next) => {
        try {
            const purchases =
                await prisma.purchase.findMany({
                    include: {
                        supplier: true,

                        creator: {
                            select: {
                                userId: true,
                                fullName: true,
                                email: true,
                                role: true,
                            },
                        },

                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },

                    orderBy: {
                        purchaseDate: "desc",
                    },
                });

            res.json({
                success: true,
                data: purchases,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// GET SINGLE PURCHASE
// ============================================================================

router.get(
    "/:id",
    authenticate,
    requirePermission("purchases.view"),
    validate(purchaseIdSchema),
    async (req, res, next) => {
        try {
            const purchase =
                await prisma.purchase.findUnique({
                    where: {
                        purchaseId:
                            req.params.id,
                    },

                    include: {
                        supplier: true,

                        creator: {
                            select: {
                                userId: true,
                                fullName: true,
                                email: true,
                                role: true,
                            },
                        },

                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });

            if (!purchase) {
                res.status(404).json({
                    success: false,
                    message:
                        "Purchase not found",
                });

                return;
            }

            res.json({
                success: true,
                data: purchase,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// CREATE PURCHASE
// ============================================================================

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
        try {
            const body = req.body ?? {};

            // ----------------------------------------------------------------
            // Supplier
            // ----------------------------------------------------------------

            const supplierId = String(
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

            // ----------------------------------------------------------------
            // Items
            // ----------------------------------------------------------------

            const rawItems = body.items;

            if (
                !Array.isArray(rawItems) ||
                rawItems.length === 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "At least one purchase item is required.",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Payment
            // ----------------------------------------------------------------

            const amountPaid = Math.max(
                0,
                Number(
                    body.amountPaid ??
                    body.AmountPaid ??
                    0
                )
            );

            const paymentMethod =
                String(
                    body.paymentMethod ??
                    body.PaymentMethod ??
                    "Bank Transfer"
                ).trim() ||
                "Bank Transfer";

            if (!Number.isFinite(amountPaid)) {
                res.status(400).json({
                    success: false,
                    message:
                        "amountPaid must be a valid number.",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Normalize items
            // ----------------------------------------------------------------

            const items = rawItems.map(
                (
                    item: any,
                    index: number
                ) => ({
                    productId: String(
                        item?.productId ??
                        item?.ProductID ??
                        ""
                    ).trim(),

                    quantity: Number(
                        item?.quantity ??
                        item?.Quantity ??
                        0
                    ),

                    unitCost: Number(
                        item?.unitCost ??
                        item?.UnitCost ??
                        item?.costPrice ??
                        item?.CostPrice ??
                        0
                    ),

                    index,
                })
            );

            // ----------------------------------------------------------------
            // Validate items
            // ----------------------------------------------------------------

            for (const item of items) {
                if (!item.productId) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Purchase item ${item.index + 1
                            } is missing productId.`,
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
                            `Invalid quantity for purchase item ${item.index + 1
                            }.`,
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
                            `Invalid unit cost for purchase item ${item.index + 1
                            }.`,
                    });

                    return;
                }
            }

            // ----------------------------------------------------------------
            // Resolve authenticated user
            // ----------------------------------------------------------------

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

            // ----------------------------------------------------------------
            // Verify staff account
            // ----------------------------------------------------------------

            const staffUser =
                await prisma.user.findUnique({
                    where: {
                        userId:
                            staffUserId,
                    },

                    select: {
                        userId: true,
                        fullName: true,
                        status: true,
                    },
                });

            if (!staffUser) {
                res.status(400).json({
                    success: false,
                    message:
                        "The authenticated staff account was not found in the database.",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Verify active account
            // ----------------------------------------------------------------

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

            // ----------------------------------------------------------------
            // Validate supplier
            // ----------------------------------------------------------------

            const supplier =
                await prisma.supplier.findUnique({
                    where: {
                        supplierId,
                    },

                    select: {
                        supplierId: true,
                        supplierName: true,
                    },
                });

            if (!supplier) {
                res.status(400).json({
                    success: false,
                    message:
                        `Supplier not found: ${supplierId}`,
                });

                return;
            }

            // ----------------------------------------------------------------
            // Transaction
            // ----------------------------------------------------------------

            const result =
                await prisma.$transaction(
                    async (tx) => {
                        let subtotal = 0;

                        const purchaseItems: Array<{
                            purchaseItemId: string;
                            productId: string;
                            quantity: number;
                            unitCost: number;
                            total: number;
                        }> = [];

                        // ----------------------------------------------------
                        // Calculate subtotal
                        // ----------------------------------------------------

                        for (
                            const item of items
                        ) {
                            const product =
                                await tx.product.findUnique({
                                    where: {
                                        productId:
                                            item.productId,
                                    },
                                });

                            if (!product) {
                                throw new Error(
                                    `Product not found: ${item.productId}`
                                );
                            }

                            const total =
                                item.quantity *
                                item.unitCost;

                            subtotal += total;

                            purchaseItems.push({
                                purchaseItemId:
                                    generateId(
                                        "PURITEM"
                                    ),

                                productId:
                                    product.productId,

                                quantity:
                                    item.quantity,

                                unitCost:
                                    item.unitCost,

                                total,
                            });
                        }

                        // ----------------------------------------------------
                        // Calculate totals
                        // ----------------------------------------------------

                        const computedTotal =
                            subtotal;

                        const computedBalance =
                            Math.max(
                                0,
                                computedTotal -
                                amountPaid
                            );

                        const paymentStatus =
                            amountPaid >=
                                computedTotal
                                ? "Paid"
                                : amountPaid > 0
                                    ? "Partial"
                                    : "Unpaid";

                        // ----------------------------------------------------
                        // Create purchase
                        // ----------------------------------------------------

                        const purchase =
                            await tx.purchase.create({
                                data: {
                                    purchaseId:
                                        generateId(
                                            "PUR"
                                        ),

                                    purchaseNumber:
                                        generatePurchaseNumber(),

                                    supplierId:
                                        supplier.supplierId,

                                    subtotal,

                                    discount: 0,

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

                                    items: {
                                        create:
                                            purchaseItems,
                                    },
                                },

                                include: {
                                    supplier: true,

                                    items: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                },
                            });

                        // ----------------------------------------------------
                        // Update stock and create movements
                        // ----------------------------------------------------

                        for (
                            const item of
                            purchaseItems
                        ) {
                            const product =
                                await tx.product.findUnique({
                                    where: {
                                        productId:
                                            item.productId,
                                    },
                                });

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

                            // ----------------------------------------------
                            // Update product quantity
                            // ----------------------------------------------

                            await tx.product.update({
                                where: {
                                    productId:
                                        item.productId,
                                },

                                data: {
                                    quantity:
                                        newQuantity,
                                },
                            });

                            // ----------------------------------------------
                            // Create stock movement
                            // ----------------------------------------------

                            await tx.stockMovement.create({
                                data: {
                                    movementId:
                                        generateId(
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
                                        purchase.purchaseId,

                                    reason:
                                        `Stock received from ${supplier.supplierName}`,

                                    staffId:
                                        staffUser.userId,
                                },
                            });
                        }

                        return purchase;
                    }
                );

            // ----------------------------------------------------------------
            // Console log
            // ----------------------------------------------------------------

            console.info(
                `[PURCHASES] Purchase created: ${result.purchaseId} / ${result.purchaseNumber} — Supplier: ${supplier.supplierName}`
            );

            // ----------------------------------------------------------------
            // Audit log
            // ----------------------------------------------------------------

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
                        `Purchase completed: ${result.purchaseNumber}, supplier ${supplier.supplierName}, total ${result.totalAmount}, paid ${result.amountPaid}, balance ${result.balance}, payment method ${paymentMethod}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                // Audit logging should never turn a successful
                // purchase into a failed purchase response.
                console.error(
                    "[PURCHASES] AUDIT ERROR:",
                    auditError
                );
            }

            // ----------------------------------------------------------------
            // Success response
            // ----------------------------------------------------------------

            res.status(201).json({
                success: true,

                message:
                    "Purchase order created and stock updated successfully.",

                data: result,
            });
        } catch (error) {
            console.error(
                "[PURCHASES] CREATE PURCHASE ERROR:",
                error
            );

            next(error);
        }
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;