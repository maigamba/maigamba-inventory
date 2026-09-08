import { Router } from "express";
import { prisma } from "../config/database";
import {
    generateId,
    generateInvoiceNumber,
} from "../utils/ids";
import { createAuditLog } from "../services/audit.service";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth";

import { validate } from "../middleware/validate";

import {
    createSaleSchema,
    saleIdSchema,
} from "../validation/sale.schema";

const router = Router();

/*
|--------------------------------------------------------------------------
| SALES ROUTES
|--------------------------------------------------------------------------
|
| Permissions:
|
| sales.view
| sales.create
|
*/

// ============================================================================
// GET ALL SALES
// ============================================================================

router.get(
    "/",
    authenticate,
    requirePermission("sales.view"),
    async (_req, res, next) => {
        try {
            const sales =
                await prisma.sale.findMany({
                    include: {
                        customer: true,
                        creator: true,

                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },

                    orderBy: {
                        saleDate: "desc",
                    },
                });

            res.json({
                success: true,
                data: sales,
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// GET SINGLE SALE
// ============================================================================

router.get(
    "/:id",
    authenticate,
    requirePermission("sales.view"),
    validate(saleIdSchema),
    async (req, res, next) => {
        try {
            const sale =
                await prisma.sale.findUnique({
                    where: {
                        saleId:
                            req.params.id,
                    },

                    include: {
                        customer: true,
                        creator: true,

                        items: {
                            include: {
                                product: true,
                            },
                        },

                        returns: true,
                    },
                });

            if (!sale) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sale not found",
                });

                return;
            }

            res.json({
                success: true,
                data: sale,
            });
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================================
// CREATE SALE
// ============================================================================

router.post(
    "/",
    authenticate,
    requirePermission("sales.create"),
    validate(createSaleSchema),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const body = req.body ?? {};

            // ----------------------------------------------------------------
            // Customer
            // ----------------------------------------------------------------

            const customerIdRaw =
                body.customerId ??
                body.CustomerID;

            const customerId =
                typeof customerIdRaw ===
                    "string" &&
                    customerIdRaw.trim() &&
                    customerIdRaw.trim() !==
                    "CUST-WALKIN"
                    ? customerIdRaw
                        .trim()
                    : undefined;

            // ----------------------------------------------------------------
            // Items
            // ----------------------------------------------------------------

            const rawItems =
                body.items;

            // ----------------------------------------------------------------
            // Sale-level values
            // ----------------------------------------------------------------

            const discount =
                body.discount !==
                    undefined
                    ? Number(
                        body.discount
                    )
                    : body.Discount !==
                        undefined
                        ? Number(
                            body.Discount
                        )
                        : 0;

            const tax =
                body.tax !== undefined
                    ? Number(body.tax)
                    : body.Tax !==
                        undefined
                        ? Number(
                            body.Tax
                        )
                        : 0;

            const amountPaid =
                body.amountPaid !==
                    undefined
                    ? Number(
                        body.amountPaid
                    )
                    : body.AmountPaid !==
                        undefined
                        ? Number(
                            body.AmountPaid
                        )
                        : 0;

            const paymentMethod =
                String(
                    body.paymentMethod ??
                    body.PaymentMethod ??
                    "Cash"
                ).trim() || "Cash";

            // ----------------------------------------------------------------
            // Normalize sale items
            // ----------------------------------------------------------------

            const items = rawItems.map(
                (
                    item: {
                        productId?: string;
                        ProductID?: string;

                        quantity?: number;
                        Quantity?: number;

                        unitPrice?: number;
                        UnitPrice?: number;

                        discount?: number;
                        Discount?: number;
                    },
                    index: number
                ) => ({
                    productId: String(
                        item?.productId ??
                        item?.ProductID ??
                        ""
                    ).trim(),

                    quantity:
                        item?.quantity !==
                            undefined
                            ? Number(
                                item.quantity
                            )
                            : item?.Quantity !==
                                undefined
                                ? Number(
                                    item.Quantity
                                )
                                : 0,

                    unitPrice:
                        item?.unitPrice !==
                            undefined
                            ? Number(
                                item.unitPrice
                            )
                            : item?.UnitPrice !==
                                undefined
                                ? Number(
                                    item.UnitPrice
                                )
                                : 0,

                    discount:
                        item?.discount !==
                            undefined
                            ? Number(
                                item.discount
                            )
                            : item?.Discount !==
                                undefined
                                ? Number(
                                    item.Discount
                                )
                                : 0,

                    index,
                })
            );

            // ----------------------------------------------------------------
            // Resolve authenticated staff user
            // ----------------------------------------------------------------

            const authenticatedUserId =
                String(
                    req.user?.userId ??
                    req.user?.id ??
                    ""
                ).trim();

            // Backward compatibility
            // with older clients
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
            // Find staff account
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
                        email: true,
                        role: true,
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
            // Verify active staff
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
            // Verify customer
            // ----------------------------------------------------------------

            if (customerId) {
                const customer =
                    await prisma.customer.findUnique({
                        where: {
                            customerId,
                        },

                        select: {
                            customerId: true,
                        },
                    });

                if (!customer) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Customer not found: ${customerId}`,
                    });

                    return;
                }
            }

            // ----------------------------------------------------------------
            // Transaction
            // ----------------------------------------------------------------

            const result =
                await prisma.$transaction(
                    async (tx) => {
                        let subtotal = 0;

                        const saleItems: Array<{
                            saleItemId: string;
                            productId: string;
                            quantity: number;
                            unitPrice: number;
                            discount: number;
                            total: number;
                        }> = [];

                        // ----------------------------------------------------
                        // Validate products and calculate subtotal
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

                            if (
                                product.quantity <
                                item.quantity
                            ) {
                                throw new Error(
                                    `Insufficient stock for ${product.productName}. Available: ${product.quantity}`
                                );
                            }

                            const total =
                                Math.max(
                                    0,
                                    item.quantity *
                                    item.unitPrice -
                                    item.discount
                                );

                            subtotal +=
                                total;

                            saleItems.push({
                                saleItemId:
                                    generateId("SALEITEM"),

                                productId:
                                    product.productId,

                                quantity:
                                    item.quantity,

                                unitPrice:
                                    item.unitPrice,

                                discount:
                                    item.discount,

                                total,
                            });
                        }

                        // ----------------------------------------------------
                        // Calculate totals
                        // ----------------------------------------------------

                        const totalAmount =
                            Math.max(
                                0,
                                subtotal -
                                discount +
                                tax
                            );

                        const balance =
                            Math.max(
                                totalAmount -
                                amountPaid,
                                0
                            );

                        const paymentStatus =
                            amountPaid >=
                                totalAmount
                                ? "Paid"
                                : amountPaid >
                                    0
                                    ? "Partially Paid"
                                    : "Pending";

                        // ----------------------------------------------------
                        // Sale data
                        // ----------------------------------------------------
                        //
                        // Kept as `any` because Prisma's generated Sale
                        // create type treats createdBy as a relation field.
                        // This matches the original working implementation.
                        // ----------------------------------------------------

                        const saleData: any = {
                            saleId:
                                generateId(
                                    "SAL"
                                ),

                            invoiceNumber:
                                generateInvoiceNumber(),

                            subtotal,

                            discount,

                            tax,

                            totalAmount,

                            amountPaid,

                            balance,

                            paymentMethod,

                            paymentStatus,

                            saleStatus:
                                "Completed",

                            createdBy:
                                staffUser.userId,

                            items: {
                                create:
                                    saleItems,
                            },
                        };

                        if (customerId) {
                            saleData.customerId =
                                customerId;
                        }

                        // ----------------------------------------------------
                        // Create sale
                        // ----------------------------------------------------

                        const sale =
                            await tx.sale.create({
                                data:
                                    saleData,

                                include: {
                                    items: true,
                                },
                            });

                        // ----------------------------------------------------
                        // Deduct stock
                        // ----------------------------------------------------

                        for (
                            const item of
                            saleItems
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

                            const previousQuantity =
                                product.quantity;

                            const newQuantity =
                                previousQuantity -
                                item.quantity;

                            if (
                                newQuantity <
                                0
                            ) {
                                throw new Error(
                                    `Insufficient stock for ${product.productName}`
                                );
                            }

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

                            // ------------------------------------------------
                            // Stock movement
                            // ------------------------------------------------

                            await tx.stockMovement.create({
                                data: {
                                    movementId:
                                        generateId(
                                            "MOV"
                                        ),

                                    productId:
                                        item.productId,

                                    movementType:
                                        "Sale",

                                    quantity:
                                        item.quantity,

                                    previousQuantity,

                                    newQuantity,

                                    referenceId:
                                        sale.saleId,

                                    reason:
                                        "Product sold",

                                    staffId:
                                        staffUser.userId,
                                },
                            });
                        }

                        return sale;
                    }
                );

            // ----------------------------------------------------------------
            // Console
            // ----------------------------------------------------------------

            console.info(
                `[SALES] Sale created: ${result.saleId} / ${result.invoiceNumber}`
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
                        "SALE",

                    module:
                        "Sales",

                    recordId:
                        result.saleId,

                    description:
                        `Sale completed: Invoice ${result.invoiceNumber}, total ${result.totalAmount}, paid ${result.amountPaid}, balance ${result.balance}, payment method ${paymentMethod}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                // Audit failure must not
                // turn a successful sale
                // into a failed response.
                console.error(
                    "[SALES] AUDIT ERROR:",
                    auditError
                );
            }

            // ----------------------------------------------------------------
            // Success response
            // ----------------------------------------------------------------

            res.status(201).json({
                success: true,
                message:
                    "Sale created successfully",
                data: result,
            });
        } catch (error) {
            console.error(
                "CREATE SALE ERROR:",
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