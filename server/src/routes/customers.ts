import { Router } from "express";
import Customer from "../models/Customer.js";
import Sale from "../models/Sale.js";
import Return from "../models/Return.js";
import { generateMongoId } from "../utils/mongoId.js";
import { createAuditLog } from "../services/audit.service.js";

import {
    authenticate,
    requirePermission,
    AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| CUSTOMERS ROUTES
|--------------------------------------------------------------------------
|
| MongoDB / Mongoose version
|
| Permissions:
|
| customers.view
| customers.create
| customers.update
| customers.delete
|
*/

/**
 * Remove MongoDB internal fields before returning documents.
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
 * Escape a value before using it in a MongoDB regex.
 */
function escapeRegex(value: string) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

/**
 * ============================================================================
 * GET ALL CUSTOMERS
 * ============================================================================
 */

router.get(
    "/",
    authenticate,
    requirePermission("customers.view"),
    async (req, res, next) => {
        try {
            const search = String(
                req.query.search ?? ""
            ).trim();

            let query: any = {};

            if (search) {
                const regex = new RegExp(
                    escapeRegex(search),
                    "i"
                );

                query = {
                    $or: [
                        {
                            customerName:
                                regex,
                        },
                        {
                            customerId:
                                regex,
                        },
                        {
                            phone: regex,
                        },
                        {
                            email: regex,
                        },
                    ],
                };
            }

            const customers =
                await Customer.find(query)
                    .sort({
                        createdAt: -1,
                    })
                    .lean();

            res.json({
                success: true,
                data: customers.map(
                    cleanDocument
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * GET SINGLE CUSTOMER
 * ============================================================================
 */

router.get(
    "/:id",
    authenticate,
    requirePermission("customers.view"),
    async (req, res, next) => {
        try {
            const customer =
                await Customer.findOne({
                    customerId:
                        req.params.id,
                }).lean();

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            /**
             * Resolve the customer's sales
             * and returns from MongoDB.
             */
            const [
                sales,
                returns,
            ] = await Promise.all([
                Sale.find({
                    customerId:
                        customer.customerId,
                })
                    .sort({
                        saleDate: -1,
                    })
                    .lean(),

                /**
                 * The original Prisma Customer
                 * relation did not explicitly show
                 * the customerId field on Return.
                 *
                 * Therefore we first try the normal
                 * customerId relationship if present.
                 */
                Return.find({
                    customerId:
                        customer.customerId,
                })
                    .sort({
                        returnDate: -1,
                    })
                    .lean(),
            ]);

            res.json({
                success: true,
                data: {
                    ...cleanDocument(
                        customer
                    ),

                    sales: sales.map(
                        cleanDocument
                    ),

                    returns:
                        returns.map(
                            cleanDocument
                        ),
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * CREATE CUSTOMER
 * ============================================================================
 */

router.post(
    "/",
    authenticate,
    requirePermission("customers.create"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            const {
                customerName,
                phone,
                email,
                address,
                customerType,
                accountBalance = 0,
                status = "Active",
            } = req.body;

            /**
             * Validate required fields.
             */
            if (
                !customerName ||
                !String(customerName).trim()
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Customer name is required",
                });

                return;
            }

            /**
             * Validate account balance.
             */
            const numericAccountBalance =
                Number(accountBalance);

            if (
                !Number.isFinite(
                    numericAccountBalance
                )
            ) {
                res.status(400).json({
                    success: false,
                    message:
                        "Account balance must be a valid number",
                });

                return;
            }

            /**
             * Create customer.
             */
            const customer =
                await Customer.create({
                    customerId:
                        generateMongoId(
                            "CUS"
                        ),

                    customerName:
                        String(
                            customerName
                        ).trim(),

                    phone:
                        phone !== undefined
                            ? String(
                                phone
                            ).trim()
                            : undefined,

                    email:
                        email !== undefined
                            ? String(
                                email
                            )
                                .trim()
                                .toLowerCase()
                            : undefined,

                    address:
                        address !==
                            undefined
                            ? String(
                                address
                            ).trim()
                            : undefined,

                    customerType:
                        customerType !==
                            undefined
                            ? String(
                                customerType
                            ).trim()
                            : undefined,

                    accountBalance:
                        numericAccountBalance,

                    status:
                        String(
                            status || "Active"
                        ).trim(),
                });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "CREATE",

                    module:
                        "Customers",

                    recordId:
                        customer.customerId,

                    description:
                        `Customer ${customer.customerName} created. Phone: ${customer.phone || "N/A"}, email: ${customer.email || "N/A"}, account balance: ${customer.accountBalance}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create customer audit log:",
                    auditError
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Customer created successfully",
                data: cleanDocument(
                    customer.toObject()
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE CUSTOMER
 * ============================================================================
 */

router.put(
    "/:id",
    authenticate,
    requirePermission("customers.update"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing customer.
             */
            const existing =
                await Customer.findOne({
                    customerId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            const {
                customerName,
                phone,
                email,
                address,
                customerType,
                accountBalance,
                status,
            } = req.body;

            /**
             * Build update data.
             */
            const updateData: Record<
                string,
                unknown
            > = {};

            if (
                customerName !==
                undefined
            ) {
                if (
                    !String(
                        customerName
                    ).trim()
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Customer name is required",
                    });

                    return;
                }

                updateData.customerName =
                    String(
                        customerName
                    ).trim();
            }

            if (phone !== undefined) {
                updateData.phone =
                    String(phone).trim();
            }

            if (email !== undefined) {
                updateData.email =
                    String(email)
                        .trim()
                        .toLowerCase();
            }

            if (address !== undefined) {
                updateData.address =
                    String(
                        address
                    ).trim();
            }

            if (
                customerType !==
                undefined
            ) {
                updateData.customerType =
                    String(
                        customerType
                    ).trim();
            }

            if (status !== undefined) {
                updateData.status =
                    String(status).trim();
            }

            /**
             * Validate account balance
             * when it is supplied.
             */
            if (
                accountBalance !==
                undefined
            ) {
                const numericAccountBalance =
                    Number(
                        accountBalance
                    );

                if (
                    !Number.isFinite(
                        numericAccountBalance
                    )
                ) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Account balance must be a valid number",
                    });

                    return;
                }

                updateData.accountBalance =
                    numericAccountBalance;
            }

            /**
             * Update customer.
             */
            const customer =
                await Customer.findOneAndUpdate(
                    {
                        customerId:
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

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "UPDATE",

                    module:
                        "Customers",

                    recordId:
                        customer.customerId,

                    description:
                        `Customer ${customer.customerName} updated. Status: ${customer.status}, account balance: ${customer.accountBalance}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create customer update audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Customer updated successfully",
                data: cleanDocument(
                    customer
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * ARCHIVE CUSTOMER
 * ============================================================================
 *
 * Archive is treated as an update because
 * it changes the customer's status.
 */

router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("customers.update"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing customer.
             */
            const existing =
                await Customer.findOne({
                    customerId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            /**
             * Archive customer.
             */
            const customer =
                await Customer.findOneAndUpdate(
                    {
                        customerId:
                            req.params.id,
                    },
                    {
                        $set: {
                            status: "Inactive",
                        },
                    },
                    {
                        returnDocument: "after",
                        runValidators: true,
                    }
                ).lean();

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "ARCHIVE",

                    module:
                        "Customers",

                    recordId:
                        customer.customerId,

                    description:
                        `Customer ${customer.customerName} archived. Previous status: ${existing.status}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create customer archive audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Customer archived successfully",
                data: cleanDocument(
                    customer
                ),
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ============================================================================
 * DELETE CUSTOMER
 * ============================================================================
 */

router.delete(
    "/:id",
    authenticate,
    requirePermission("customers.delete"),
    async (
        req: AuthenticatedRequest,
        res,
        next
    ) => {
        try {
            /**
             * Find existing customer.
             */
            const existing =
                await Customer.findOne({
                    customerId:
                        req.params.id,
                }).lean();

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message:
                        "Customer not found",
                });

                return;
            }

            /**
             * Delete customer.
             */
            await Customer.deleteOne({
                customerId:
                    req.params.id,
            });

            /**
             * Audit trail.
             */
            try {
                await createAuditLog({
                    userId:
                        req.user?.userId,

                    action:
                        "DELETE",

                    module:
                        "Customers",

                    recordId:
                        existing.customerId,

                    description:
                        `Customer ${existing.customerName} deleted. Phone: ${existing.phone || "N/A"}, email: ${existing.email || "N/A"}.`,

                    ipAddress:
                        req.ip ||
                        req.socket
                            .remoteAddress ||
                        undefined,
                });
            } catch (auditError) {
                console.error(
                    "Failed to create customer delete audit log:",
                    auditError
                );
            }

            res.json({
                success: true,
                message:
                    "Customer deleted successfully",
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

