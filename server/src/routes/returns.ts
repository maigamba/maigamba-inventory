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
import { z } from "zod";

const router = Router();

const returnDateSchema = z.string().trim().max(50).optional().nullable();

const createReturnSchema = z.object({
    body: z.object({
        returnId: z.string().trim().max(100).optional(),
        saleId: z.string().trim().max(100).optional().nullable(),
        productId: z.string().trim().min(1, "Product is required").max(100),
        serialNumber: z.string().trim().max(150).optional().nullable(),
        customerId: z.string().trim().max(100).optional().nullable(),
        returnDate: returnDateSchema,
        reason: z.string().trim().min(1, "Return reason is required").max(500),
        quantity: z.coerce.number().finite().int().min(1).max(1000000),
        refundAmount: z.coerce.number().finite().min(0).max(100000000000).optional(),
        returnType: z.string().trim().max(100).optional(),
        conditionAfterReturn: z.string().trim().max(100).optional(),
        status: z.string().trim().max(50).optional(),
        restock: z.union([z.boolean(), z.string()]).optional(),
        processedBy: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(1000).optional().nullable(),
    }),
});

const updateReturnSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Return ID is required").max(100),
    }),
    body: z.object({
        saleId: z.string().trim().max(100).optional().nullable(),
        productId: z.string().trim().min(1).max(100).optional(),
        serialNumber: z.string().trim().max(150).optional().nullable(),
        customerId: z.string().trim().max(100).optional().nullable(),
        returnDate: returnDateSchema,
        reason: z.string().trim().min(1).max(500).optional(),
        quantity: z.coerce.number().finite().int().min(1).max(1000000).optional(),
        refundAmount: z.coerce.number().finite().min(0).max(100000000000).optional(),
        returnType: z.string().trim().max(100).optional().nullable(),
        conditionAfterReturn: z.string().trim().max(100).optional().nullable(),
        status: z.string().trim().max(50).optional().nullable(),
        processedBy: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(1000).optional().nullable(),
    }),
});

const returnIdSchema = z.object({
    params: z.object({
        id: z.string().trim().min(1, "Return ID is required").max(100),
    }),
});



type ReturnBody = {
    returnId?: string;
    saleId?: string;
    productId?: string;
    serialNumber?: string;
    customerId?: string;
    returnDate?: string;
    reason?: string;
    quantity?: number | string;
    refundAmount?: number | string;
    returnType?: string;
    conditionAfterReturn?: string;
    status?: string;
    restock?: boolean | string;
    processedBy?: string;
    notes?: string;
};

const isTrue = (value: unknown) =>
    value === true ||
    String(value ?? "")
        .toLowerCase()
        .trim() === "true";

const clean = (value: unknown) => {
    const text = String(value ?? "").trim();
    return text || undefined;
};

/*
|--------------------------------------------------------------------------
| RETURNS ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| returns.view
| returns.create
| returns.update
|
*/

/**
 * ============================================================================
 * GET ALL RETURNS
 * ============================================================================
 */
router.get(
    "/",
    authenticate,
    requirePermission("returns.view"),
    validate(returnIdSchema),
    async (req, res, next) => {
        try {
            const search = String(req.query.search ?? "").trim();

            const returns = await prisma.return.findMany({
                where: search
                    ? {
                        OR: [
                            {
                                returnId: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                saleId: {
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
                                reason: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                processedBy: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : undefined,

                orderBy: {
                    returnDate: "desc",
                },
            });

            res.json({
                success: true,
                data: returns,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE RETURN
 * ============================================================================
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("returns.view"),
    async (req, res, next) => {
        try {
            const record = await prisma.return.findUnique({
                where: {
                    returnId: req.params.id,
                },
            });

            if (!record) {
                res.status(404).json({
                    success: false,
                    message: "Return not found",
                });

                return;
            }

            res.json({
                success: true,
                data: record,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE RETURN
 * ============================================================================
 */
router.post(
    "/",
    authenticate,
    requirePermission("returns.create"),
    validate(createReturnSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const body = req.body as ReturnBody;

            // ----------------------------------------------------------------
            // Clean input values
            // ----------------------------------------------------------------

            const productId = clean(body.productId);
            const saleId = clean(body.saleId);
            const customerId = clean(body.customerId);
            const serialNumber = clean(body.serialNumber);
            const reason = clean(body.reason);

            // ----------------------------------------------------------------
            // Use authenticated user
            // ----------------------------------------------------------------

            const authenticatedUserId = clean(req.user?.userId);

            if (!authenticatedUserId) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user ID is required to process a return",
                });

                return;
            }

            const processedBy = authenticatedUserId;

            // ----------------------------------------------------------------
            // Quantity
            // ----------------------------------------------------------------

            const quantity = Number(body.quantity);

            // ----------------------------------------------------------------
            // Refund
            // ----------------------------------------------------------------

            const refundAmount =
                body.refundAmount === undefined ||
                    body.refundAmount === null
                    ? 0
                    : Number(body.refundAmount);

            // ----------------------------------------------------------------
            // Restock
            // ----------------------------------------------------------------

            const restock = isTrue(body.restock);

            // ----------------------------------------------------------------
            // Validation
            // ----------------------------------------------------------------

            if (!productId) {
                res.status(400).json({
                    success: false,
                    message: "Product is required",
                });

                return;
            }

            if (!reason) {
                res.status(400).json({
                    success: false,
                    message: "Return reason is required",
                });

                return;
            }

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Return quantity must be a whole number greater than zero",
                });

                return;
            }

            if (
                !Number.isFinite(refundAmount) ||
                refundAmount < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Refund amount must be zero or a valid positive number",
                });

                return;
            }

            // ----------------------------------------------------------------
            // Transaction
            // ----------------------------------------------------------------

            const result = await prisma.$transaction(
                async (tx) => {
                    const product =
                        await tx.product.findUnique({
                            where: {
                                productId,
                            },
                        });

                    if (!product) {
                        throw new Error(
                            `Product not found: ${productId}`
                        );
                    }

                    let resolvedCustomerId = customerId;
                    let resolvedSaleId = saleId;

                    // --------------------------------------------------------
                    // Resolve sale
                    // --------------------------------------------------------

                    if (saleId) {
                        const sale =
                            await tx.sale.findUnique({
                                where: {
                                    saleId,
                                },
                            });

                        if (!sale) {
                            throw new Error(
                                `Sale not found: ${saleId}`
                            );
                        }

                        resolvedCustomerId =
                            resolvedCustomerId ??
                            sale.customerId ??
                            undefined;
                    } else {
                        resolvedSaleId = undefined;
                    }

                    // --------------------------------------------------------
                    // Return ID
                    // --------------------------------------------------------

                    const returnId =
                        clean(body.returnId) ||
                        generateId("RET");

                    // --------------------------------------------------------
                    // Create return
                    // --------------------------------------------------------

                    const record =
                        await tx.return.create({
                            data: {
                                returnId,

                                saleId:
                                    resolvedSaleId,

                                productId,

                                serialNumber,

                                customerId:
                                    resolvedCustomerId,

                                returnDate:
                                    body.returnDate
                                        ? new Date(
                                            body.returnDate
                                        )
                                        : new Date(),

                                reason,

                                quantity,

                                refundAmount,

                                returnType:
                                    clean(
                                        body.returnType
                                    ) ||
                                    "Customer Return",

                                conditionAfterReturn:
                                    clean(
                                        body.conditionAfterReturn
                                    ) ||
                                    (restock
                                        ? "Good"
                                        : "Defective / RMA"),

                                status:
                                    clean(body.status) ||
                                    "Completed",

                                processedBy,

                                notes: clean(
                                    body.notes
                                ),
                            },
                        });

                    // --------------------------------------------------------
                    // Restock
                    // --------------------------------------------------------

                    if (restock) {
                        const previousQuantity =
                            product.quantity;

                        const newQuantity =
                            previousQuantity +
                            quantity;

                        await tx.product.update({
                            where: {
                                productId,
                            },

                            data: {
                                quantity:
                                    newQuantity,
                            },
                        });

                        const staffId = clean(
                            req.user?.userId
                        );

                        await tx.stockMovement.create({
                            data: {
                                movementId:
                                    generateId("MOV"),

                                productId,

                                movementType:
                                    "Return",

                                quantity,

                                previousQuantity,

                                newQuantity,

                                referenceId:
                                    record.returnId,

                                reason:
                                    `Customer return: ${reason}`,

                                ...(staffId
                                    ? {
                                        staffId,
                                    }
                                    : {}),

                                notes:
                                    "Stock restored from customer return",
                            },
                        });
                    }

                    return record;
                }
            );

            // ----------------------------------------------------------------
            // Audit Trail
            // ----------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        authenticatedUserId,

                    action: "RETURN",

                    module: "Returns",

                    recordId:
                        result.returnId,

                    description:
                        `Return ${result.returnId} processed for product ${result.productId}. Quantity: ${result.quantity}, refund: ${result.refundAmount}, restocked: ${restock ? "Yes" : "No"}, reason: ${result.reason}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create return audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Return processed successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE RETURN
 * ============================================================================
 */
router.put(
    "/:id",
    authenticate,
    requirePermission("returns.update"),
    validate(updateReturnSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const existing =
                await prisma.return.findUnique({
                    where: {
                        returnId: req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message: "Return not found",
                });

                return;
            }

            const body = req.body as ReturnBody;

            const data: Record<string, any> = {};

            const returnFields = [
                "saleId",
                "productId",
                "serialNumber",
                "customerId",
                "reason",
                "returnType",
                "conditionAfterReturn",
                "status",
                "processedBy",
                "notes",
            ] as const;

            for (const field of returnFields) {
                if (body[field] !== undefined) {
                    data[field] =
                        body[field] === ""
                            ? null
                            : body[field];
                }
            }

            if (body.quantity !== undefined) {
                const quantity = Number(
                    body.quantity
                );

                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Return quantity must be a whole number greater than zero",
                    });

                    return;
                }

                data.quantity = quantity;
            }

            if (
                body.refundAmount !== undefined
            ) {
                const refundAmount = Number(
                    body.refundAmount
                );

                if (
                    !Number.isFinite(
                        refundAmount
                    ) ||
                    refundAmount < 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Refund amount must be zero or a valid positive number",
                    });

                    return;
                }

                data.refundAmount = refundAmount;
            }

            if (
                body.returnDate !== undefined
            ) {
                const parsedDate = new Date(
                    body.returnDate
                );

                if (
                    Number.isNaN(
                        parsedDate.getTime()
                    )
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "returnDate must be a valid date",
                    });

                    return;
                }

                data.returnDate = parsedDate;
            }

            // --------------------------------------------------------------
            // Always associate updates with authenticated user when possible
            // --------------------------------------------------------------

            if (req.user?.userId) {
                data.processedBy =
                    req.user.userId;
            }

            const updated =
                await prisma.return.update({
                    where: {
                        returnId: req.params.id,
                    },

                    data,
                });

            // ----------------------------------------------------------------
            // Audit Trail
            // ----------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        clean(req.user?.userId),

                    action: "UPDATE",

                    module: "Returns",

                    recordId:
                        updated.returnId,

                    description:
                        `Return ${updated.returnId} updated. Product: ${updated.productId}, quantity: ${updated.quantity}, refund: ${updated.refundAmount}, status: ${updated.status}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create return update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Return updated successfully",
                data: updated,
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE RETURN
 * ============================================================================
 *
 * The permission service currently has no returns.delete permission.
 * Therefore DELETE remains Admin-only.
 */
router.delete(
    "/:id",
    authenticate,
    validate(returnIdSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            if (
                !req.user ||
                String(req.user.role)
                    .trim()
                    .toLowerCase() !==
                "admin"
            ) {
                res.status(403).json({
                    success: false,
                    message:
                        "You do not have permission to perform this action.",
                });

                return;
            }

            const existing =
                await prisma.return.findUnique({
                    where: {
                        returnId: req.params.id,
                    },
                });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message: "Return not found",
                });

                return;
            }

            await prisma.return.delete({
                where: {
                    returnId: req.params.id,
                },
            });

            // ----------------------------------------------------------------
            // Audit Trail
            // ----------------------------------------------------------------

            try {
                await createAuditLog({
                    userId:
                        clean(req.user.userId),

                    action: "DELETE",

                    module: "Returns",

                    recordId:
                        existing.returnId,

                    description:
                        `Return ${existing.returnId} deleted. Product: ${existing.productId}, quantity: ${existing.quantity}, refund: ${existing.refundAmount}, reason: ${existing.reason}.`,

                    ipAddress:
                        req.ip,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create return delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Return deleted successfully",
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