import { Router } from "express";
import { prisma } from "../config/database";
import { generateId } from "../utils/ids";
import { createAuditLog } from "../services/audit.service";
import { validate } from "../middleware/validate";
import { z } from "zod";
import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

const stockAdjustmentBodySchema = z.object({
    productId: z.string().trim().max(100).optional(),
    quantity: z.coerce
        .number()
        .finite()
        .int()
        .refine((value) => value !== 0, {
            message: "Quantity must be a non-zero integer",
        })
        .refine((value) => Math.abs(value) <= 1000000, {
            message: "Quantity is too large",
        }),
    type: z
        .string()
        .trim()
        .toUpperCase()
        .refine((value) => value === "" || value === "IN" || value === "OUT", {
            message: "Type must be IN or OUT",
        })
        .optional(),
    movementType: z.string().trim().max(100).optional(),
    adjustmentType: z
        .string()
        .trim()
        .toUpperCase()
        .refine(
            (value) =>
                value === "" ||
                value === "ADJUSTMENT_IN" ||
                value === "ADJUSTMENT_OUT",
            {
                message:
                    "Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT",
            }
        )
        .optional(),
    reason: z.string().trim().max(500).optional().nullable(),
    staffId: z.string().trim().max(100).optional(),
    staff: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
});

const stockAdjustmentSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Product ID is required").max(100),
    }),
    body: stockAdjustmentBodySchema,
});

const legacyStockAdjustmentSchema = z.object({
    body: stockAdjustmentBodySchema.extend({
        productId: z
            .string()
            .trim()
            .min(1, "Product ID is required")
            .max(100),
    }),
});

const stockMovementIdSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Stock movement ID is required").max(100),
    }),
});

type StockAdjustmentBody = z.infer<typeof stockAdjustmentBodySchema>;


/*
|--------------------------------------------------------------------------
| STOCK ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| stock.view
| stock.adjust
|
*/


// ============================================================================
// GET ALL STOCK MOVEMENTS
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("stock.view"),
    async (_req, res, next) => {
        try {
            const movements =
                await prisma.stockMovement.findMany({
                    include: {
                        product: true,
                        staff: true,
                    },

                    orderBy: {
                        movementDate: "desc",
                    },
                });

            res.json({
                success: true,
                data: movements,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// GET SINGLE STOCK MOVEMENT
// ============================================================================

router.get(
    "/:id",
    authenticate,
    validate(stockMovementIdSchema),
    requirePermission("stock.view"),
    async (req, res, next) => {
        try {
            const movement =
                await prisma.stockMovement.findUnique({
                    where: {
                        movementId:
                            req.params.id,
                    },

                    include: {
                        product: true,
                        staff: true,
                    },
                });

            if (!movement) {
                res.status(404).json({
                    success: false,
                    message:
                        "Stock movement not found",
                });

                return;
            }

            res.json({
                success: true,
                data: movement,
            });
        } catch (error) {
            next(error);
        }
    }
);


// ============================================================================
// PERFORM STOCK ADJUSTMENT
// ============================================================================

async function performStockAdjustment(
    productId: string,
    body: StockAdjustmentBody,
    req: AuthenticatedRequest,
    res: any,
    next: any,
) {
    try {
        const {
            quantity,
            type,
            movementType,
            adjustmentType,
            reason,
            notes,
        } = body;

        // --------------------------------------------------------------------
        // Validate product and quantity
        // --------------------------------------------------------------------

        if (
            !productId ||
            quantity === undefined ||
            quantity === null
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Product and quantity are required",
            });

            return;
        }

        const rawQuantity = Number(quantity);

        // --------------------------------------------------------------------
        // Quantity must be a non-zero integer
        // --------------------------------------------------------------------

        if (
            !Number.isInteger(rawQuantity) ||
            rawQuantity === 0
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Quantity must be a non-zero integer",
            });

            return;
        }

        // --------------------------------------------------------------------
        // Determine whether this is stock IN or stock OUT
        // --------------------------------------------------------------------

        const normalizedType = String(
            type ?? ""
        )
            .trim()
            .toUpperCase();

        const normalizedAdjustmentType =
            String(
                adjustmentType ?? ""
            )
                .trim()
                .toUpperCase();

        if (
            normalizedType &&
            normalizedType !== "IN" &&
            normalizedType !== "OUT"
        ) {
            res.status(400).json({
                success: false,
                message: "Type must be IN or OUT",
            });

            return;
        }

        if (
            normalizedAdjustmentType &&
            normalizedAdjustmentType !== "ADJUSTMENT_IN" &&
            normalizedAdjustmentType !== "ADJUSTMENT_OUT"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT",
            });

            return;
        }

        if (
            normalizedType &&
            normalizedAdjustmentType &&
            ((normalizedType === "OUT" &&
                normalizedAdjustmentType !== "ADJUSTMENT_OUT") ||
                (normalizedType === "IN" &&
                    normalizedAdjustmentType !== "ADJUSTMENT_IN"))
        ) {
            res.status(400).json({
                success: false,
                message: "Type and adjustmentType do not match",
            });

            return;
        }

        const signedQuantity =
            normalizedType === "OUT" ||
                normalizedAdjustmentType ===
                "ADJUSTMENT_OUT"
                ? -Math.abs(rawQuantity)
                : Math.abs(rawQuantity);

        // --------------------------------------------------------------------
        // Determine movement type
        // --------------------------------------------------------------------

        const finalMovementType =
            String(
                movementType ?? ""
            ).trim() ||
            (normalizedType === "OUT"
                ? "Adjustment Out"
                : "Adjustment In");

        // --------------------------------------------------------------------
        // Authenticated user
        // --------------------------------------------------------------------

        const authenticatedUserId =
            String(
                req.user?.userId ?? ""
            ).trim();

        if (!authenticatedUserId) {
            res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID is required",
            });

            return;
        }

        // --------------------------------------------------------------------
        // Transaction
        // --------------------------------------------------------------------

        const result = await prisma.$transaction(
            async (tx) => {
                // ----------------------------------------------------------
                // Find product
                // ----------------------------------------------------------

                const product =
                    await tx.product.findUnique({
                        where: {
                            productId,
                        },
                    });

                if (!product) {
                    const error = new Error(
                        "Product not found"
                    );

                    (error as any).statusCode =
                        404;

                    throw error;
                }

                // ----------------------------------------------------------
                // Calculate new quantity
                // ----------------------------------------------------------

                const previousQuantity =
                    product.quantity;

                const newQuantity =
                    previousQuantity +
                    signedQuantity;

                // ----------------------------------------------------------
                // Prevent negative stock
                // ----------------------------------------------------------

                if (newQuantity < 0) {
                    const error =
                        new Error(
                            `Cannot remove ${Math.abs(
                                signedQuantity
                            )} units. Current stock is only ${previousQuantity}.`
                        );

                    (error as any).statusCode =
                        400;

                    throw error;
                }

                // ----------------------------------------------------------
                // Update product quantity
                // ----------------------------------------------------------

                await tx.product.update({
                    where: {
                        productId,
                    },

                    data: {
                        quantity:
                            newQuantity,
                    },
                });

                // ----------------------------------------------------------
                // Create stock movement
                // ----------------------------------------------------------

                const movement =
                    await tx.stockMovement.create({
                        data: {
                            movementId:
                                generateId(
                                    "MOV"
                                ),

                            productId,

                            movementType:
                                finalMovementType,

                            quantity:
                                Math.abs(
                                    signedQuantity
                                ),

                            previousQuantity,

                            newQuantity,

                            reason: reason
                                ? String(
                                    reason
                                ).trim()
                                : null,

                            staffId: authenticatedUserId,

                            notes: notes
                                ? String(
                                    notes
                                ).trim()
                                : null,
                        },
                    });

                return {
                    movement,
                    productName:
                        product.productName,
                    previousQuantity,
                    newQuantity,
                };
            }
        );

        // --------------------------------------------------------------------
        // Audit Trail
        // --------------------------------------------------------------------

        try {
            await createAuditLog({
                userId:
                    authenticatedUserId,

                action:
                    "STOCK_ADJUSTMENT",

                module: "Stock",

                recordId:
                    result.movement
                        .movementId,

                description:
                    `Stock adjusted for product ${result.productName} (${productId}). Movement: ${finalMovementType}, quantity: ${Math.abs(
                        signedQuantity
                    )}, stock: ${result.previousQuantity} → ${result.newQuantity}, reason: ${reason
                        ? String(
                            reason
                        ).trim()
                        : "N/A"
                    }.`,

                ipAddress:
                    req.ip,
            });
        } catch (auditError) {
            console.error(
                "Failed to create stock audit log:",
                auditError
            );
        }

        // --------------------------------------------------------------------
        // Success response
        // --------------------------------------------------------------------

        res.status(201).json({
            success: true,
            message:
                "Stock adjusted successfully",
            data: result.movement,
        });
    } catch (error: any) {
        // --------------------------------------------------------------------
        // Known application error
        // --------------------------------------------------------------------

        if (error?.statusCode) {
            res.status(
                error.statusCode
            ).json({
                success: false,
                message:
                    error.message,
            });

            return;
        }

        // --------------------------------------------------------------------
        // Unknown error
        // --------------------------------------------------------------------

        next(error);
    }
}


// ============================================================================
// ADJUST STOCK — PRIMARY ENDPOINT
// ============================================================================
//
// POST /api/stock/:productId/adjust
//
// Requires:
// stock.adjust
//
// ============================================================================

router.post(
    "/:id/adjust",
    authenticate,
    requirePermission("stock.adjust"),
    validate(stockAdjustmentSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        await performStockAdjustment(
            req.params.id,
            req.body,
            req,
            res,
            next
        );
    }
);


// ============================================================================
// ADJUST STOCK — BACKWARD COMPATIBLE ENDPOINT
// ============================================================================
//
// POST /api/stock/adjust
//
// Body:
// {
//     productId,
//     quantity,
//     ...
// }
//
// Requires:
// stock.adjust
//
// ============================================================================

router.post(
    "/adjust",
    authenticate,
    requirePermission("stock.adjust"),
    validate(legacyStockAdjustmentSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        const productId = String(
            req.body?.productId ?? ""
        ).trim();

        await performStockAdjustment(
            productId,
            req.body,
            req,
            res,
            next
        );
    }
);


// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;