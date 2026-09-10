import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import Product from "../models/Product";
import StockMovement from "../models/StockMovement";
import User from "../models/User";

import { generateMongoId } from "../utils/mongoId";
import { createAuditLog } from "../services/audit.service";

import { validate } from "../middleware/validate";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| STOCK ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| stock.view
| stock.adjust
|
*/

/**
 * ============================================================================
 * VALIDATION
 * ============================================================================
 */

const stockAdjustmentBodySchema = z.object({
    productId: z
        .string()
        .trim()
        .max(100)
        .optional(),

    quantity: z.coerce
        .number()
        .finite()
        .int()
        .refine(
            (value) => value !== 0,
            {
                message:
                    "Quantity must be a non-zero integer",
            }
        )
        .refine(
            (value) =>
                Math.abs(value) <=
                1000000,
            {
                message:
                    "Quantity is too large",
            }
        ),

    type: z
        .string()
        .trim()
        .toUpperCase()
        .refine(
            (value) =>
                value === "" ||
                value === "IN" ||
                value === "OUT",
            {
                message:
                    "Type must be IN or OUT",
            }
        )
        .optional(),

    movementType: z
        .string()
        .trim()
        .max(100)
        .optional(),

    adjustmentType: z
        .string()
        .trim()
        .toUpperCase()
        .refine(
            (value) =>
                value === "" ||
                value ===
                "ADJUSTMENT_IN" ||
                value ===
                "ADJUSTMENT_OUT",
            {
                message:
                    "Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT",
            }
        )
        .optional(),

    reason: z
        .string()
        .trim()
        .max(500)
        .optional()
        .nullable(),

    staffId: z
        .string()
        .trim()
        .max(100)
        .optional(),

    staff: z
        .string()
        .trim()
        .max(100)
        .optional(),

    notes: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .nullable(),
});

const stockAdjustmentSchema =
    z.object({
        params: z.object({
            id: z
                .string()
                .trim()
                .min(
                    1,
                    "Product ID is required"
                )
                .max(100),
        }),

        body:
            stockAdjustmentBodySchema,
    });

const legacyStockAdjustmentSchema =
    z.object({
        body:
            stockAdjustmentBodySchema.extend(
                {
                    productId: z
                        .string()
                        .trim()
                        .min(
                            1,
                            "Product ID is required"
                        )
                        .max(100),
                }
            ),
    });

const stockMovementIdSchema =
    z.object({
        params: z.object({
            id: z
                .string()
                .trim()
                .min(
                    1,
                    "Stock movement ID is required"
                )
                .max(100),
        }),
    });

type StockAdjustmentBody =
    z.infer<
        typeof stockAdjustmentBodySchema
    >;

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

function cleanDocument(
    document: any
) {
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

function escapeRegex(
    value: string
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

/**
 * ============================================================================
 * GET ALL STOCK MOVEMENTS
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("stock.view"),
    async (_req, res, next) => {
        try {
            const movements =
                await StockMovement.find(
                    {}
                )
                    .sort({
                        movementDate: -1,
                    })
                    .lean();

            /**
             * Resolve products and users
             * manually because MongoDB does
             * not use Prisma relations.
             */

            const productIds =
                Array.from(
                    new Set(
                        movements
                            .map(
                                (movement: any) =>
                                    movement.productId
                            )
                            .filter(Boolean)
                            .map(String)
                    )
                );

            const userIds =
                Array.from(
                    new Set(
                        movements
                            .map(
                                (movement: any) =>
                                    movement.createdBy
                            )
                            .filter(Boolean)
                            .map(String)
                    )
                );

            const [
                products,
                users,
            ] = await Promise.all([
                Product.find({
                    productId: {
                        $in: productIds,
                    },
                }).lean(),

                User.find({
                    userId: {
                        $in: userIds,
                    },
                }).lean(),
            ]);

            const productMap =
                new Map<string, any>(
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

            const userMap =
                new Map<string, any>(
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

            const data =
                movements.map(
                    (movement: any) => ({
                        ...cleanDocument(
                            movement
                        ),

                        product:
                            productMap.get(
                                String(
                                    movement.productId
                                )
                            ) ?? null,

                        staff:
                            movement.createdBy
                                ? userMap.get(
                                    String(
                                        movement.createdBy
                                    )
                                ) ?? null
                                : null,

                        /**
                         * Keep compatibility
                         * with the previous API.
                         */
                        staffId:
                            movement.createdBy ??
                            null,
                    })
                );

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error(
                "[STOCK] FETCH MOVEMENTS ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE STOCK MOVEMENT
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    validate(
        stockMovementIdSchema
    ),
    requirePermission("stock.view"),
    async (req, res, next) => {
        try {
            const movement =
                await StockMovement.findOne(
                    {
                        movementId:
                            req.params.id,
                    }
                ).lean();

            if (!movement) {
                res.status(404).json({
                    success: false,
                    message:
                        "Stock movement not found",
                });

                return;
            }

            const [
                product,
                staff,
            ] = await Promise.all([
                Product.findOne({
                    productId:
                        movement.productId,
                }).lean(),

                movement.createdBy
                    ? User.findOne({
                        userId:
                            movement.createdBy,
                    }).lean()
                    : null,
            ]);

            res.json({
                success: true,

                data: {
                    ...cleanDocument(
                        movement
                    ),

                    product:
                        cleanDocument(
                            product
                        ) ?? null,

                    staff:
                        cleanDocument(
                            staff
                        ) ?? null,

                    staffId:
                        movement.createdBy ??
                        null,
                },
            });
        } catch (error) {
            console.error(
                "[STOCK] FETCH MOVEMENT ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * PERFORM STOCK ADJUSTMENT
 * ============================================================================
 */

async function performStockAdjustment(
    productId: string,
    body: StockAdjustmentBody,
    req: AuthenticatedRequest,
    res: any,
    next: any
) {
    const session =
        await mongoose.startSession();

    try {
        const {
            quantity,
            type,
            movementType,
            adjustmentType,
            reason,
            notes,
        } = body;

        /**
         * --------------------------------------------------------------------
         * Validate product and quantity
         * --------------------------------------------------------------------
         */

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

        const rawQuantity =
            Number(quantity);

        if (
            !Number.isInteger(
                rawQuantity
            ) ||
            rawQuantity === 0
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Quantity must be a non-zero integer",
            });

            return;
        }

        /**
         * --------------------------------------------------------------------
         * Determine IN / OUT
         * --------------------------------------------------------------------
         */

        const normalizedType =
            String(type ?? "")
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
                message:
                    "Type must be IN or OUT",
            });

            return;
        }

        if (
            normalizedAdjustmentType &&
            normalizedAdjustmentType !==
            "ADJUSTMENT_IN" &&
            normalizedAdjustmentType !==
            "ADJUSTMENT_OUT"
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
            (
                (
                    normalizedType ===
                    "OUT" &&
                    normalizedAdjustmentType !==
                    "ADJUSTMENT_OUT"
                ) ||
                (
                    normalizedType ===
                    "IN" &&
                    normalizedAdjustmentType !==
                    "ADJUSTMENT_IN"
                )
            )
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Type and adjustmentType do not match",
            });

            return;
        }

        const signedQuantity =
            normalizedType ===
                "OUT" ||
                normalizedAdjustmentType ===
                "ADJUSTMENT_OUT"
                ? -Math.abs(
                    rawQuantity
                )
                : Math.abs(
                    rawQuantity
                );

        /**
         * --------------------------------------------------------------------
         * Movement type
         * --------------------------------------------------------------------
         */

        const finalMovementType =
            String(
                movementType ?? ""
            ).trim() ||
            (
                normalizedType ===
                    "OUT"
                    ? "Adjustment Out"
                    : "Adjustment In"
            );

        /**
         * --------------------------------------------------------------------
         * Authenticated user
         * --------------------------------------------------------------------
         */

        const authenticatedUserId =
            String(
                req.user?.userId ?? ""
            ).trim();

        if (
            !authenticatedUserId
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID is required",
            });

            return;
        }

        /**
         * --------------------------------------------------------------------
         * Start MongoDB transaction
         * --------------------------------------------------------------------
         */

        session.startTransaction();

        /**
         * Verify authenticated user.
         */
        const user =
            await User.findOne({
                userId:
                    authenticatedUserId,
            }).session(
                session
            );

        if (!user) {
            const error =
                new Error(
                    "Authenticated user not found"
                );

            (error as any)
                .statusCode = 401;

            throw error;
        }

        /**
         * --------------------------------------------------------------------
         * Find product
         * --------------------------------------------------------------------
         */

        const product =
            await Product.findOne({
                productId,
            }).session(
                session
            );

        if (!product) {
            const error =
                new Error(
                    "Product not found"
                );

            (error as any)
                .statusCode = 404;

            throw error;
        }

        /**
         * --------------------------------------------------------------------
         * Calculate new quantity
         * --------------------------------------------------------------------
         */

        const previousQuantity =
            Number(
                product.quantity
            );

        const newQuantity =
            previousQuantity +
            signedQuantity;

        /**
         * --------------------------------------------------------------------
         * Prevent negative stock
         * --------------------------------------------------------------------
         */

        if (
            newQuantity < 0
        ) {
            const error =
                new Error(
                    `Cannot remove ${Math.abs(
                        signedQuantity
                    )} units. Current stock is only ${previousQuantity}.`
                );

            (error as any)
                .statusCode = 400;

            throw error;
        }

        /**
         * --------------------------------------------------------------------
         * Update product quantity
         * --------------------------------------------------------------------
         */

        await Product.updateOne(
            {
                productId,
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
         * --------------------------------------------------------------------
         * Create stock movement
         * --------------------------------------------------------------------
         */

        const movementId =
            generateMongoId(
                "MOV"
            );

        const movement =
            await StockMovement.create(
                [
                    {
                        movementId,

                        productId,

                        movementType:
                            finalMovementType,

                        quantity:
                            Math.abs(
                                signedQuantity
                            ),

                        previousQuantity,

                        newQuantity,

                        referenceId:
                            undefined,

                        reason: reason
                            ? String(
                                reason
                            ).trim()
                            : undefined,

                        createdBy:
                            authenticatedUserId,

                        movementDate:
                            new Date(),
                    },
                ],
                {
                    session,
                }
            );

        await session.commitTransaction();

        const createdMovement =
            movement[0];

        /**
         * --------------------------------------------------------------------
         * Audit trail
         * --------------------------------------------------------------------
         */

        try {
            await createAuditLog({
                userId:
                    authenticatedUserId,

                action:
                    "STOCK_ADJUSTMENT",

                module:
                    "Stock",

                recordId:
                    createdMovement.movementId,

                description:
                    `Stock adjusted for product ${product.productName} (${productId}). Movement: ${finalMovementType}, quantity: ${Math.abs(
                        signedQuantity
                    )}, stock: ${previousQuantity} → ${newQuantity}, reason: ${reason
                        ? String(
                            reason
                        ).trim()
                        : "N/A"
                    }.`,

                ipAddress:
                    req.ip ||
                    req.socket
                        .remoteAddress ||
                    undefined,
            });
        } catch (auditError) {
            console.error(
                "[STOCK] AUDIT ERROR:",
                auditError
            );
        }

        /**
         * --------------------------------------------------------------------
         * Success
         * --------------------------------------------------------------------
         */

        res.status(201).json({
            success: true,

            message:
                "Stock adjusted successfully",

            data: {
                ...cleanDocument(
                    createdMovement.toObject()
                ),

                productName:
                    product.productName,

                staffId:
                    authenticatedUserId,
            },
        });
    } catch (error: any) {
        if (
            session.inTransaction()
        ) {
            await session.abortTransaction();
        }

        if (
            error?.statusCode
        ) {
            res.status(
                error.statusCode
            ).json({
                success: false,
                message:
                    error.message,
            });

            return;
        }

        console.error(
            "[STOCK] ADJUSTMENT ERROR:",
            error
        );

        next(error);
    } finally {
        await session.endSession();
    }
}

/**
 * ============================================================================
 * ADJUST STOCK — PRIMARY ENDPOINT
 * ============================================================================
 *
 * POST /api/stock/:productId/adjust
 *
 * Requires:
 * stock.adjust
 *
 * ============================================================================
 */

router.post(
    "/:id/adjust",
    authenticate,
    requirePermission(
        "stock.adjust"
    ),
    validate(
        stockAdjustmentSchema
    ),
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

/**
 * ============================================================================
 * ADJUST STOCK — BACKWARD COMPATIBLE ENDPOINT
 * ============================================================================
 *
 * POST /api/stock/adjust
 *
 * Body:
 * {
 *     productId,
 *     quantity,
 *     ...
 * }
 *
 * Requires:
 * stock.adjust
 *
 * ============================================================================
 */

router.post(
    "/adjust",
    authenticate,
    requirePermission(
        "stock.adjust"
    ),
    validate(
        legacyStockAdjustmentSchema
    ),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        const productId =
            String(
                req.body?.productId ??
                ""
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

/**
 * ============================================================================
 * EXPORT ROUTER
 * ============================================================================
 */

export default router;