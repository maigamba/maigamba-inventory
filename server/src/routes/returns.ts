import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Return from "../models/Return";
import Product from "../models/Product";
import Sale from "../models/Sale";
import Customer from "../models/Customer";
import User from "../models/User";
import StockMovement from "../models/StockMovement";

import { generateMongoId } from "../utils/mongoId";
import { createAuditLog } from "../services/audit.service";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

import { validate } from "../middleware/validate";

const router = Router();

/*
|--------------------------------------------------------------------------
| RETURNS ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| returns.view
| returns.create
| returns.update
|
| DELETE:
| Admin only, preserving the previous behavior.
|
*/

/**
 * ============================================================================
 * VALIDATION
 * ============================================================================
 */

const returnDateSchema = z
    .string()
    .trim()
    .max(50)
    .optional()
    .nullable();

const createReturnSchema = z.object({
    body: z.object({
        returnId: z
            .string()
            .trim()
            .max(100)
            .optional(),

        saleId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        productId: z
            .string()
            .trim()
            .min(
                1,
                "Product is required"
            )
            .max(100),

        serialNumber: z
            .string()
            .trim()
            .max(150)
            .optional()
            .nullable(),

        customerId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        returnDate:
            returnDateSchema,

        reason: z
            .string()
            .trim()
            .min(
                1,
                "Return reason is required"
            )
            .max(500),

        quantity: z.coerce
            .number()
            .finite()
            .int()
            .min(1)
            .max(1000000),

        refundAmount: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000)
            .optional(),

        returnType: z
            .string()
            .trim()
            .max(100)
            .optional(),

        conditionAfterReturn: z
            .string()
            .trim()
            .max(100)
            .optional(),

        status: z
            .string()
            .trim()
            .max(50)
            .optional(),

        restock: z
            .union([
                z.boolean(),
                z.string(),
            ])
            .optional(),

        processedBy: z
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
    }),
});

const updateReturnSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(
                1,
                "Return ID is required"
            )
            .max(100),
    }),

    body: z.object({
        saleId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        productId: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .optional(),

        serialNumber: z
            .string()
            .trim()
            .max(150)
            .optional()
            .nullable(),

        customerId: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        returnDate:
            returnDateSchema,

        reason: z
            .string()
            .trim()
            .min(1)
            .max(500)
            .optional(),

        quantity: z.coerce
            .number()
            .finite()
            .int()
            .min(1)
            .max(1000000)
            .optional(),

        refundAmount: z.coerce
            .number()
            .finite()
            .min(0)
            .max(100000000000)
            .optional(),

        returnType: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        conditionAfterReturn: z
            .string()
            .trim()
            .max(100)
            .optional()
            .nullable(),

        status: z
            .string()
            .trim()
            .max(50)
            .optional()
            .nullable(),

        processedBy: z
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
    }),
});

const returnIdSchema = z.object({
    params: z.object({
        id: z
            .string()
            .trim()
            .min(
                1,
                "Return ID is required"
            )
            .max(100),
    }),
});

/**
 * ============================================================================
 * TYPES / HELPERS
 * ============================================================================
 */

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

const isTrue = (
    value: unknown
) =>
    value === true ||
    String(value ?? "")
        .toLowerCase()
        .trim() === "true";

const clean = (
    value: unknown
) => {
    const text = String(
        value ?? ""
    ).trim();

    return text || undefined;
};

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

/**
 * Parse return date safely.
 */
function parseReturnDate(
    value: unknown
): Date {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return new Date();
    }

    const parsedDate =
        new Date(
            String(value).trim()
        );

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        throw new Error(
            "returnDate must be a valid date"
        );
    }

    return parsedDate;
}

/**
 * ============================================================================
 * GET ALL RETURNS
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("returns.view"),
    async (req, res, next) => {
        try {
            const search = String(
                req.query.search ?? ""
            ).trim();

            const filter: Record<
                string,
                any
            > = {};

            if (search) {
                const regex =
                    new RegExp(
                        search.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        ),
                        "i"
                    );

                filter.$or = [
                    {
                        returnId:
                            regex,
                    },
                    {
                        saleId:
                            regex,
                    },
                    {
                        productId:
                            regex,
                    },
                    {
                        reason:
                            regex,
                    },
                    {
                        processedBy:
                            regex,
                    },
                    {
                        customerId:
                            regex,
                    },
                    {
                        serialNumber:
                            regex,
                    },
                ];
            }

            const records =
                await Return.find(
                    filter
                )
                    .sort({
                        returnDate: -1,
                    })
                    .lean();

            /**
             * Resolve related records.
             */
            const productIds =
                Array.from(
                    new Set(
                        records
                            .map(
                                (item) =>
                                    item.productId
                            )
                            .filter(Boolean)
                            .map(String)
                    )
                );

            const customerIds =
                Array.from(
                    new Set(
                        records
                            .map(
                                (item) =>
                                    item.customerId
                            )
                            .filter(Boolean)
                            .map(String)
                    )
                );

            const saleIds =
                Array.from(
                    new Set(
                        records
                            .map(
                                (item) =>
                                    item.saleId
                            )
                            .filter(Boolean)
                            .map(String)
                    )
                );

            const [
                products,
                customers,
                sales,
            ] =
                await Promise.all([
                    Product.find({
                        productId: {
                            $in: productIds,
                        },
                    }).lean(),

                    Customer.find({
                        customerId: {
                            $in: customerIds,
                        },
                    }).lean(),

                    Sale.find({
                        saleId: {
                            $in: saleIds,
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

            const customerMap =
                new Map<string, any>(
                    customers.map(
                        (customer: any) =>
                            [
                                String(
                                    customer.customerId
                                ),
                                cleanDocument(
                                    customer
                                ),
                            ] as [
                                string,
                                any
                            ]
                    )
                );

            const saleMap =
                new Map<string, any>(
                    sales.map(
                        (sale: any) =>
                            [
                                String(
                                    sale.saleId
                                ),
                                cleanDocument(
                                    sale
                                ),
                            ] as [
                                string,
                                any
                            ]
                    )
                );

            const data =
                records.map(
                    (record: any) => ({
                        ...cleanDocument(
                            record
                        ),

                        product:
                            productMap.get(
                                String(
                                    record.productId
                                )
                            ) ?? null,

                        customer:
                            record.customerId
                                ? customerMap.get(
                                    String(
                                        record.customerId
                                    )
                                ) ?? null
                                : null,

                        sale:
                            record.saleId
                                ? saleMap.get(
                                    String(
                                        record.saleId
                                    )
                                ) ?? null
                                : null,
                    })
                );

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error(
                "[RETURNS] FETCH ERROR:",
                error
            );

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
            const record =
                await Return.findOne({
                    returnId:
                        req.params.id,
                }).lean();

            if (!record) {
                res.status(404).json({
                    success: false,
                    message:
                        "Return not found",
                });

                return;
            }

            const [
                product,
                customer,
                sale,
            ] = await Promise.all([
                Product.findOne({
                    productId:
                        record.productId,
                }).lean(),

                record.customerId
                    ? Customer.findOne({
                        customerId:
                            record.customerId,
                    }).lean()
                    : null,

                record.saleId
                    ? Sale.findOne({
                        saleId:
                            record.saleId,
                    }).lean()
                    : null,
            ]);

            res.json({
                success: true,

                data: {
                    ...cleanDocument(
                        record
                    ),

                    product:
                        cleanDocument(
                            product
                        ) ?? null,

                    customer:
                        cleanDocument(
                            customer
                        ) ?? null,

                    sale:
                        cleanDocument(
                            sale
                        ) ?? null,
                },
            });
        } catch (error) {
            console.error(
                "[RETURNS] FETCH SINGLE ERROR:",
                error
            );

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
        const session =
            await mongoose.startSession();

        try {
            const body =
                req.body as ReturnBody;

            const productId =
                clean(
                    body.productId
                );

            const saleId =
                clean(body.saleId);

            const customerId =
                clean(
                    body.customerId
                );

            const serialNumber =
                clean(
                    body.serialNumber
                );

            const reason =
                clean(body.reason);

            const authenticatedUserId =
                clean(
                    req.user?.userId
                );

            if (
                !authenticatedUserId
            ) {
                res.status(401).json({
                    success: false,
                    message:
                        "Authenticated user ID is required to process a return",
                });

                return;
            }

            const processedBy =
                authenticatedUserId;

            const quantity =
                Number(
                    body.quantity
                );

            const refundAmount =
                body.refundAmount ===
                    undefined ||
                    body.refundAmount ===
                    null
                    ? 0
                    : Number(
                        body.refundAmount
                    );

            const restock =
                isTrue(
                    body.restock
                );

            if (!productId) {
                res.status(400).json({
                    success: false,
                    message:
                        "Product is required",
                });

                return;
            }

            if (!reason) {
                res.status(400).json({
                    success: false,
                    message:
                        "Return reason is required",
                });

                return;
            }

            if (
                !Number.isInteger(
                    quantity
                ) ||
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

            let parsedReturnDate:
                Date;

            try {
                parsedReturnDate =
                    parseReturnDate(
                        body.returnDate
                    );
            } catch {
                res.status(400).json({
                    success: false,
                    message:
                        "returnDate must be a valid date",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * MongoDB transaction
             * ---------------------------------------------------------------
             */

            session.startTransaction();

            const product =
                await Product.findOne({
                    productId,
                }).session(
                    session
                );

            if (!product) {
                throw new Error(
                    `Product not found: ${productId}`
                );
            }

            let resolvedCustomerId =
                customerId;

            let resolvedSaleId =
                saleId;

            /**
             * ---------------------------------------------------------------
             * Resolve sale
             * ---------------------------------------------------------------
             */

            if (saleId) {
                const sale =
                    await Sale.findOne({
                        saleId,
                    }).session(
                        session
                    );

                if (!sale) {
                    throw new Error(
                        `Sale not found: ${saleId}`
                    );
                }

                resolvedCustomerId =
                    resolvedCustomerId ??
                    clean(
                        sale.customerId
                    );

                resolvedSaleId =
                    sale.saleId;
            }

            /**
             * ---------------------------------------------------------------
             * Validate customer when supplied
             * ---------------------------------------------------------------
             */

            if (
                resolvedCustomerId
            ) {
                const customer =
                    await Customer.findOne(
                        {
                            customerId:
                                resolvedCustomerId,
                        }
                    ).session(
                        session
                    );

                if (!customer) {
                    throw new Error(
                        `Customer not found: ${resolvedCustomerId}`
                    );
                }
            }

            /**
             * ---------------------------------------------------------------
             * Validate authenticated user
             * ---------------------------------------------------------------
             */

            const user =
                await User.findOne({
                    userId:
                        authenticatedUserId,
                }).session(
                    session
                );

            if (!user) {
                throw new Error(
                    `Authenticated user not found: ${authenticatedUserId}`
                );
            }

            /**
             * ---------------------------------------------------------------
             * Generate Return ID
             * ---------------------------------------------------------------
             */

            const returnId =
                clean(
                    body.returnId
                ) ||
                generateMongoId(
                    "RET"
                );

            const duplicateReturn =
                await Return.findOne({
                    returnId,
                }).session(
                    session
                );

            if (
                duplicateReturn
            ) {
                throw new Error(
                    `Return ID already exists: ${returnId}`
                );
            }

            /**
             * ---------------------------------------------------------------
             * Create return
             * ---------------------------------------------------------------
             */

            const returnType =
                clean(
                    body.returnType
                ) ||
                "Customer Return";

            const conditionAfterReturn =
                clean(
                    body.conditionAfterReturn
                ) ||
                (restock
                    ? "Good"
                    : "Defective / RMA");

            const status =
                clean(
                    body.status
                ) ||
                "Completed";

            const createdReturn =
                await Return.create(
                    [
                        {
                            returnId,

                            saleId:
                                resolvedSaleId,

                            productId,

                            serialNumber,

                            customerId:
                                resolvedCustomerId,

                            returnDate:
                                parsedReturnDate,

                            reason,

                            quantity,

                            refundAmount,

                            returnType,

                            conditionAfterReturn,

                            status,

                            restock,

                            processedBy,

                            notes:
                                clean(
                                    body.notes
                                ),
                        },
                    ],
                    {
                        session,
                    }
                );

            const record =
                createdReturn[0];

            /**
             * ---------------------------------------------------------------
             * Restock product
             * ---------------------------------------------------------------
             */

            if (restock) {
                const previousQuantity =
                    Number(
                        product.quantity
                    );

                const newQuantity =
                    previousQuantity +
                    quantity;

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

                await StockMovement.create(
                    [
                        {
                            movementId:
                                generateMongoId(
                                    "MOV"
                                ),

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
            }

            await session.commitTransaction();

            /**
             * ---------------------------------------------------------------
             * Audit trail
             * ---------------------------------------------------------------
             */

            try {
                await createAuditLog({
                    userId:
                        authenticatedUserId,

                    action:
                        "RETURN",

                    module:
                        "Returns",

                    recordId:
                        record.returnId,

                    description:
                        `Return ${record.returnId} processed for product ${record.productId}. Quantity: ${record.quantity}, refund: ${record.refundAmount}, restocked: ${restock ? "Yes" : "No"}, reason: ${record.reason}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[RETURNS] CREATE AUDIT ERROR:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,

                message:
                    "Return processed successfully",

                data: cleanDocument(
                    record.toObject()
                ),
            });
        } catch (error) {
            if (
                session.inTransaction()
            ) {
                await session.abortTransaction();
            }

            console.error(
                "[RETURNS] CREATE ERROR:",
                error
            );

            next(error);
        } finally {
            await session.endSession();
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
                await Return.findOne({
                    returnId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Return not found",
                });

                return;
            }

            const body =
                req.body as ReturnBody;

            const data: Record<
                string,
                any
            > = {};

            const returnFields = [
                "saleId",
                "productId",
                "serialNumber",
                "customerId",
                "reason",
                "returnType",
                "conditionAfterReturn",
                "status",
                "notes",
            ] as const;

            for (const field of returnFields) {
                if (
                    body[field] !==
                    undefined
                ) {
                    data[field] =
                        body[field] ===
                            ""
                            ? undefined
                            : body[field];
                }
            }

            if (
                body.quantity !==
                undefined
            ) {
                const quantity =
                    Number(
                        body.quantity
                    );

                if (
                    !Number.isInteger(
                        quantity
                    ) ||
                    quantity <= 0
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Return quantity must be a whole number greater than zero",
                    });

                    return;
                }

                data.quantity =
                    quantity;
            }

            if (
                body.refundAmount !==
                undefined
            ) {
                const refundAmount =
                    Number(
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

                data.refundAmount =
                    refundAmount;
            }

            if (
                body.returnDate !==
                undefined
            ) {
                try {
                    data.returnDate =
                        parseReturnDate(
                            body.returnDate
                        );
                } catch {
                    res.status(400).json({
                        success: false,
                        message:
                            "returnDate must be a valid date",
                    });

                    return;
                }
            }

            /**
             * Never allow the frontend to
             * change who processed the return.
             */
            if (
                req.user?.userId
            ) {
                data.processedBy =
                    req.user.userId;
            }

            /**
             * Validate product if changed.
             */
            if (
                data.productId
            ) {
                const product =
                    await Product.findOne({
                        productId:
                            data.productId,
                    }).lean();

                if (!product) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Product not found: ${data.productId}`,
                    });

                    return;
                }
            }

            /**
             * Validate customer if changed.
             */
            if (
                data.customerId
            ) {
                const customer =
                    await Customer.findOne({
                        customerId:
                            data.customerId,
                    }).lean();

                if (!customer) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Customer not found: ${data.customerId}`,
                    });

                    return;
                }
            }

            /**
             * Validate sale if changed.
             */
            if (
                data.saleId
            ) {
                const sale =
                    await Sale.findOne({
                        saleId:
                            data.saleId,
                    }).lean();

                if (!sale) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Sale not found: ${data.saleId}`,
                    });

                    return;
                }
            }

            const updated =
                await Return.findOneAndUpdate(
                    {
                        returnId:
                            req.params.id,
                    },
                    {
                        $set: data,
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!updated) {
                res.status(404).json({
                    success: false,
                    message:
                        "Return not found",
                });

                return;
            }

            /**
             * Audit trail
             */
            try {
                await createAuditLog({
                    userId:
                        clean(
                            req.user?.userId
                        ),

                    action:
                        "UPDATE",

                    module:
                        "Returns",

                    recordId:
                        updated.returnId,

                    description:
                        `Return ${updated.returnId} updated. Product: ${updated.productId}, quantity: ${updated.quantity}, refund: ${updated.refundAmount}, status: ${updated.status}.`,

                    ipAddress:
                        req.ip ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[RETURNS] UPDATE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Return updated successfully",

                data: cleanDocument(
                    updated
                ),
            });
        } catch (error) {
            console.error(
                "[RETURNS] UPDATE ERROR:",
                error
            );

            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE RETURN
 * ============================================================================
 *
 * The previous permission service did not have
 * returns.delete, therefore DELETE remains Admin-only.
 *
 * IMPORTANT:
 * This deletes the return record only.
 * It does not automatically reverse an existing
 * stock-restock operation.
 * ============================================================================
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
                String(
                    req.user.role
                )
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
                await Return.findOne({
                    returnId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Return not found",
                });

                return;
            }

            await Return.deleteOne({
                returnId:
                    req.params.id,
            });

            /**
             * Audit trail
             */
            try {
                await createAuditLog({
                    userId:
                        clean(
                            req.user.userId
                        ),

                    action:
                        "DELETE",

                    module:
                        "Returns",

                    recordId:
                        existing.returnId,

                    description:
                        `Return ${existing.returnId} deleted. Product: ${existing.productId}, quantity: ${existing.quantity}, refund: ${existing.refundAmount}, reason: ${existing.reason}.`,

                    ipAddress:
                        req.ip ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "[RETURNS] DELETE AUDIT ERROR:",
                    auditError
                );
            }

            res.json({
                success: true,

                message:
                    "Return deleted successfully",
            });
        } catch (error) {
            console.error(
                "[RETURNS] DELETE ERROR:",
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
