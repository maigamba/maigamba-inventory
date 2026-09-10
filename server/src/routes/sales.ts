import { Router } from "express";
import mongoose from "mongoose";

import Sale from "../models/Sale";
import SaleItem from "../models/SaleItem";
import Product from "../models/Product";
import Customer from "../models/Customer";
import User from "../models/User";
import Return from "../models/Return";
import StockMovement from "../models/StockMovement";

import {
    generateMongoId,
} from "../utils/mongoId";

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
| MongoDB / Mongoose version
|
| Permissions:
|
| sales.view
| sales.create
|
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
 * Escape user input before creating a MongoDB regex.
 */
function escapeRegex(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

/**
 * ============================================================================
 * GET ALL SALES
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("sales.view"),
    async (_req, res, next) => {
        try {
            const sales =
                await Sale.find({})
                    .sort({
                        saleDate: -1,
                    })
                    .lean();

            /**
             * Resolve related data manually because
             * MongoDB does not use Prisma relations.
             */
            const customerIds = [
                ...new Set(
                    sales
                        .map(
                            (sale: any) =>
                                sale.customerId
                        )
                        .filter(Boolean)
                ),
            ];

            const userIds = [
                ...new Set(
                    sales
                        .map(
                            (sale: any) =>
                                sale.createdBy
                        )
                        .filter(Boolean)
                ),
            ];

            const saleIds = sales.map(
                (sale: any) =>
                    sale.saleId
            );

            const [
                customers,
                users,
                saleItems,
            ] = await Promise.all([
                customerIds.length
                    ? Customer.find({
                        customerId: {
                            $in: customerIds,
                        },
                    }).lean()
                    : [],

                userIds.length
                    ? User.find({
                        userId: {
                            $in: userIds,
                        },
                    }).lean()
                    : [],

                saleIds.length
                    ? SaleItem.find({
                        saleId: {
                            $in: saleIds,
                        },
                    }).lean()
                    : [],
            ]);

            /**
             * Resolve products used by sale items.
             */
            const productIds = [
                ...new Set(
                    saleItems
                        .map(
                            (item: any) =>
                                item.productId
                        )
                        .filter(Boolean)
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
             * Explicit tuple types prevent TypeScript
             * from treating map results as any[][].
             */
            const customerMap = new Map<
                string,
                any
            >(
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

            const itemsBySale =
                new Map<
                    string,
                    any[]
                >();

            for (
                const item of saleItems
            ) {
                const existing =
                    itemsBySale.get(
                        item.saleId
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

                itemsBySale.set(
                    item.saleId,
                    existing
                );
            }

            const result = sales.map(
                (sale: any) => ({
                    ...cleanDocument(
                        sale
                    ),

                    customer:
                        sale.customerId
                            ? customerMap.get(
                                String(
                                    sale.customerId
                                )
                            ) || null
                            : null,

                    creator:
                        sale.createdBy
                            ? userMap.get(
                                String(
                                    sale.createdBy
                                )
                            ) || null
                            : null,

                    items:
                        itemsBySale.get(
                            sale.saleId
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
 * GET SINGLE SALE
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    requirePermission("sales.view"),
    validate(saleIdSchema),
    async (req, res, next) => {
        try {
            const sale =
                await Sale.findOne({
                    saleId:
                        req.params.id,
                }).lean();

            if (!sale) {
                res.status(404).json({
                    success: false,
                    message:
                        "Sale not found",
                });

                return;
            }

            const [
                customer,
                creator,
                saleItems,
                returns,
            ] = await Promise.all([
                sale.customerId
                    ? Customer.findOne({
                        customerId:
                            sale.customerId,
                    }).lean()
                    : null,

                sale.createdBy
                    ? User.findOne({
                        userId:
                            sale.createdBy,
                    }).lean()
                    : null,

                SaleItem.find({
                    saleId:
                        sale.saleId,
                }).lean(),

                Return.find({
                    saleId:
                        sale.saleId,
                })
                    .sort({
                        returnDate: -1,
                    })
                    .lean(),
            ]);

            /**
             * Resolve products for sale items.
             */
            const productIds = [
                ...new Set(
                    saleItems
                        .map(
                            (item: any) =>
                                item.productId
                        )
                        .filter(Boolean)
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
                saleItems.map(
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
                    sale
                ),

                customer:
                    cleanDocument(
                        customer
                    ) || null,

                creator:
                    cleanDocument(
                        creator
                    ) || null,

                items:
                    normalizedItems,

                returns:
                    returns.map(
                        cleanDocument
                    ),
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
 * CREATE SALE
 * ============================================================================
 */

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
        let session:
            | mongoose.ClientSession
            | undefined;

        try {
            const body =
                req.body ?? {};

            /**
             * ---------------------------------------------------------------
             * Customer
             * ---------------------------------------------------------------
             */

            const customerIdRaw =
                body.customerId ??
                body.CustomerID;

            const customerId =
                typeof customerIdRaw ===
                    "string" &&
                    customerIdRaw.trim() &&
                    customerIdRaw.trim() !==
                    "CUST-WALKIN"
                    ? customerIdRaw.trim()
                    : undefined;

            /**
             * ---------------------------------------------------------------
             * Items
             * ---------------------------------------------------------------
             */

            const rawItems =
                Array.isArray(
                    body.items
                )
                    ? body.items
                    : [];

            if (
                rawItems.length === 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "At least one sale item is required.",
                });

                return;
            }

            /**
             * ---------------------------------------------------------------
             * Sale-level values
             * ---------------------------------------------------------------
             */

            const rawDiscount =
                body.discount !==
                    undefined
                    ? body.discount
                    : body.Discount !==
                        undefined
                        ? body.Discount
                        : 0;

            const rawTax =
                body.tax !==
                    undefined
                    ? body.tax
                    : body.Tax !==
                        undefined
                        ? body.Tax
                        : 0;

            const rawAmountPaid =
                body.amountPaid !==
                    undefined
                    ? body.amountPaid
                    : body.AmountPaid !==
                        undefined
                        ? body.AmountPaid
                        : 0;

            const discount =
                Number(rawDiscount);

            const tax =
                Number(rawTax);

            const amountPaid =
                Number(rawAmountPaid);

            if (
                !Number.isFinite(
                    discount
                ) ||
                discount < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Discount must be a valid number.",
                });

                return;
            }

            if (
                !Number.isFinite(tax) ||
                tax < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Tax must be a valid number.",
                });

                return;
            }

            if (
                !Number.isFinite(
                    amountPaid
                ) ||
                amountPaid < 0
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Amount paid must be a valid number.",
                });

                return;
            }

            const paymentMethod =
                String(
                    body.paymentMethod ??
                    body.PaymentMethod ??
                    "Cash"
                ).trim() || "Cash";

            /**
             * ---------------------------------------------------------------
             * Normalize sale items
             * ---------------------------------------------------------------
             */

            const items =
                rawItems.map(
                    (
                        item: any,
                        index: number
                    ) => {
                        const productId =
                            String(
                                item?.productId ??
                                item?.ProductID ??
                                ""
                            ).trim();

                        const quantity =
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
                                    : 0;

                        const unitPrice =
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
                                    : 0;

                        const itemDiscount =
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
                                    : 0;

                        if (
                            !productId
                        ) {
                            throw new Error(
                                `Product is required for sale item ${index + 1}.`
                            );
                        }

                        if (
                            !Number.isFinite(
                                quantity
                            ) ||
                            quantity <= 0
                        ) {
                            throw new Error(
                                `Quantity must be greater than zero for sale item ${index + 1}.`
                            );
                        }

                        if (
                            !Number.isFinite(
                                unitPrice
                            ) ||
                            unitPrice < 0
                        ) {
                            throw new Error(
                                `Unit price must be a valid number for sale item ${index + 1}.`
                            );
                        }

                        if (
                            !Number.isFinite(
                                itemDiscount
                            ) ||
                            itemDiscount < 0
                        ) {
                            throw new Error(
                                `Item discount must be a valid number for sale item ${index + 1}.`
                            );
                        }

                        const totalPrice =
                            Math.max(
                                0,
                                quantity *
                                unitPrice -
                                itemDiscount
                            );

                        return {
                            productId,
                            quantity,
                            unitPrice,
                            discount:
                                itemDiscount,
                            totalPrice,
                        };
                    }
                );

            /**
             * ---------------------------------------------------------------
             * Resolve authenticated staff user
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
             * Find staff account
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
             * Verify active staff
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
             * Verify customer
             * ---------------------------------------------------------------
             */

            if (customerId) {
                const customer =
                    await Customer.findOne(
                        {
                            customerId,
                        }
                    ).lean();

                if (!customer) {
                    res.status(400).json({
                        success: false,
                        message:
                            `Customer not found: ${customerId}`,
                    });

                    return;
                }
            }

            /**
             * ---------------------------------------------------------------
             * MongoDB transaction
             * ---------------------------------------------------------------
             */

            session =
                await mongoose.startSession();

            let createdSale: any;

            await session.withTransaction(
                async () => {
                    let subtotal = 0;

                    const saleItemsToCreate: Array<{
                        saleItemId: string;
                        saleId: string;
                        productId: string;
                        quantity: number;
                        unitPrice: number;
                        totalPrice: number;
                    }> = [];

                    /**
                     * -------------------------------------------------------
                     * Validate products and calculate subtotal
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

                        if (
                            product.quantity <
                            item.quantity
                        ) {
                            throw new Error(
                                `Insufficient stock for ${product.productName}. Available: ${product.quantity}`
                            );
                        }

                        const totalPrice =
                            item.totalPrice;

                        subtotal +=
                            totalPrice;

                        saleItemsToCreate.push(
                            {
                                saleItemId:
                                    generateMongoId(
                                        "SALEITEM"
                                    ),

                                saleId:
                                    "",

                                productId:
                                    product.productId,

                                quantity:
                                    item.quantity,

                                unitPrice:
                                    item.unitPrice,

                                totalPrice,
                            }
                        );
                    }

                    /**
                     * -------------------------------------------------------
                     * Calculate totals
                     * -------------------------------------------------------
                     */

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

                    /**
                     * Keep the working POS payment
                     * status behavior.
                     */
                    const paymentStatus =
                        amountPaid >=
                            totalAmount
                            ? "Paid"
                            : amountPaid >
                                0
                                ? "Partially Paid"
                                : "Pending";

                    const saleId =
                        generateMongoId(
                            "SAL"
                        );

                    /**
                     * Generate invoice number.
                     *
                     * Uses a timestamp plus random
                     * component to avoid collisions.
                     */
                    const invoiceNumber =
                        `INV-${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 6)
                            .toUpperCase()}`;

                    /**
                     * -------------------------------------------------------
                     * Create sale
                     * -------------------------------------------------------
                     */

                    const sale =
                        await Sale.create(
                            [
                                {
                                    saleId,

                                    invoiceNumber,

                                    customerId,

                                    saleDate:
                                        new Date(),

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
                                },
                            ],
                            {
                                session,
                            }
                        );

                    createdSale =
                        sale[0];

                    /**
                     * Add sale ID to sale items.
                     */
                    for (
                        const item of saleItemsToCreate
                    ) {
                        item.saleId =
                            saleId;
                    }

                    /**
                     * -------------------------------------------------------
                     * Create sale items
                     * -------------------------------------------------------
                     */

                    await SaleItem.insertMany(
                        saleItemsToCreate,
                        {
                            session,
                        }
                    );

                    /**
                     * -------------------------------------------------------
                     * Deduct stock
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
                                );

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
                         * ---------------------------------------------------
                         * Stock movement
                         * ---------------------------------------------------
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
                                        "Sale",

                                    quantity:
                                        item.quantity,

                                    previousQuantity,

                                    newQuantity,

                                    referenceId:
                                        saleId,

                                    reason:
                                        "Product sold",

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
             * Close MongoDB session.
             */
            await session.endSession();
            session =
                undefined;

            /**
             * ---------------------------------------------------------------
             * Load complete result
             * ---------------------------------------------------------------
             */

            const resultSale =
                await Sale.findOne({
                    saleId:
                        createdSale.saleId,
                }).lean();

            if (!resultSale) {
                throw new Error(
                    "Sale was created but could not be retrieved."
                );
            }

            const [
                resultCustomer,
                resultCreator,
                resultItems,
            ] = await Promise.all([
                resultSale.customerId
                    ? Customer.findOne({
                        customerId:
                            resultSale.customerId,
                    }).lean()
                    : null,

                User.findOne({
                    userId:
                        resultSale.createdBy,
                }).lean(),

                SaleItem.find({
                    saleId:
                        resultSale.saleId,
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

            const normalizedResultItems =
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
                    resultSale
                ),

                customer:
                    cleanDocument(
                        resultCustomer
                    ) || null,

                creator:
                    cleanDocument(
                        resultCreator
                    ) || null,

                items:
                    normalizedResultItems,
            };

            /**
             * ---------------------------------------------------------------
             * Console
             * ---------------------------------------------------------------
             */

            console.info(
                `[SALES] Sale created: ${result.saleId} / ${result.invoiceNumber}`
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
                /**
                 * Audit failure must not
                 * turn a successful sale
                 * into a failed response.
                 */
                console.error(
                    "[SALES] AUDIT ERROR:",
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
                    "Sale created successfully",
                data: result,
            });
        } catch (error) {
            /**
             * Make sure a session is closed
             * if something fails.
             */
            if (session) {
                try {
                    if (
                        session.inTransaction()
                    ) {
                        await session.abortTransaction();
                    }
                } catch {
                    // Ignore abort errors.
                }

                try {
                    await session.endSession();
                } catch {
                    // Ignore cleanup errors.
                }
            }

            console.error(
                "CREATE SALE ERROR:",
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