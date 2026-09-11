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

function clean(value: unknown): string {
    return String(value ?? "").trim();
}

function optionalString(value: unknown): string | undefined {
    const valueString = clean(value);
    return valueString || undefined;
}

function customerResponse(customer: any) {
    if (!customer) return customer;

    return {
        ...customer,
        CustomerID: customer.customerId,
        CustomerName: customer.customerName,
        Phone: customer.phone ?? "",
        Email: customer.email ?? "",
        Address: customer.address ?? "",
        City: customer.city ?? "",
        State: customer.state ?? "",
        Country: customer.country ?? "Nigeria",
        CustomerType: customer.customerType ?? "Retail",
        AccountBalance: Number(customer.accountBalance ?? 0),
        Status: customer.status ?? "Active",
        CreatedAt: customer.createdAt,
        UpdatedAt: customer.updatedAt,
    };
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
            const search = clean(req.query.search);

            const filter: Record<string, any> = {};

            if (search) {
                filter.$or = [
                    { customerId: { $regex: search, $options: "i" } },
                    { customerName: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { city: { $regex: search, $options: "i" } },
                    { state: { $regex: search, $options: "i" } },
                    { country: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } },
                ];
            }

            const customers = await Customer.find(filter)
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                data: customers.map(customerResponse),
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
            const customerId = clean(req.params.id);

            const customer = await Customer.findOne({
                customerId,
            }).lean();

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
                return;
            }

            const [sales, returns] = await Promise.all([
                Sale.find({ customerId }).sort({ saleDate: -1 }).lean(),
                Return.find({ customerId }).sort({ returnDate: -1 }).lean(),
            ]);

            res.json({
                success: true,
                data: {
                    ...customerResponse(customer),
                    sales,
                    returns,
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
    async (req: AuthenticatedRequest, res, next) => {
        try {
            const body = req.body ?? {};

            const customerName = clean(
                body.customerName ?? body.CustomerName ?? body.name
            );

            if (!customerName) {
                res.status(400).json({
                    success: false,
                    message: "Customer name is required",
                });
                return;
            }

            const customerId =
                clean(body.customerId ?? body.CustomerID) ||
                generateMongoId("CUS");

            const customer = await Customer.create({
                customerId,
                customerName,
                phone: optionalString(body.phone ?? body.Phone),
                email: optionalString(body.email ?? body.Email)?.toLowerCase(),
                address: optionalString(body.address ?? body.Address),
                city: optionalString(body.city ?? body.City),
                state: optionalString(
                    body.state ?? body.State ?? body.stateName
                ),
                country:
                    optionalString(
                        body.country ??
                        body.Country ??
                        body.countryName ??
                        body.CountryName
                    ) || "Nigeria",
                customerType:
                    optionalString(
                        body.customerType ?? body.CustomerType
                    ) || "Retail",
                accountBalance: Number(
                    body.accountBalance ?? body.AccountBalance ?? 0
                ) || 0,
                status:
                    optionalString(body.status ?? body.Status) || "Active",
            });

            const authenticatedUserId = clean(req.user?.userId);

            try {
                await createAuditLog({
                    userId: authenticatedUserId,
                    action: "CREATE",
                    module: "Customers",
                    recordId: customer.customerId,
                    description: `Customer ${customer.customerName} (${customer.customerId}) was created.`,
                    ipAddress: req.ip,
                });
            } catch (auditError) {
                console.error("Failed to create customer audit log:", auditError);
            }

            res.status(201).json({
                success: true,
                message: "Customer created successfully",
                data: customerResponse(customer.toObject()),
            });
        } catch (error: any) {
            if (error?.code === 11000) {
                res.status(409).json({
                    success: false,
                    message: "A customer with this ID already exists",
                });
                return;
            }

            next(error);
        }
    }
);

/**
 * ============================================================================
 * UPDATE CUSTOMER
 *
 * IMPORTANT:
 * This explicitly saves Country, State and City to MongoDB.
 * ============================================================================
 */
router.put(
    "/:id",
    authenticate,
    requirePermission("customers.update"),
    async (req: AuthenticatedRequest, res, next) => {
        try {
            const customerId = clean(req.params.id);
            const body = req.body ?? {};

            if (!customerId) {
                res.status(400).json({
                    success: false,
                    message: "Customer ID is required",
                });
                return;
            }

            const existing = await Customer.findOne({ customerId });

            if (!existing) {
                res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
                return;
            }

            const customerName = clean(
                body.customerName ??
                body.CustomerName ??
                body.name ??
                existing.customerName
            );

            if (!customerName) {
                res.status(400).json({
                    success: false,
                    message: "Customer name is required",
                });
                return;
            }

            // Build the update explicitly so MongoDB receives all location fields.
            const updateData: Record<string, any> = {
                customerName,

                phone:
                    body.phone !== undefined || body.Phone !== undefined
                        ? optionalString(body.phone ?? body.Phone)
                        : existing.phone,

                email:
                    body.email !== undefined || body.Email !== undefined
                        ? optionalString(body.email ?? body.Email)?.toLowerCase()
                        : existing.email,

                address:
                    body.address !== undefined || body.Address !== undefined
                        ? optionalString(body.address ?? body.Address)
                        : existing.address,

                city:
                    body.city !== undefined || body.City !== undefined
                        ? optionalString(body.city ?? body.City)
                        : existing.city,

                state:
                    body.state !== undefined ||
                        body.State !== undefined ||
                        body.stateName !== undefined
                        ? optionalString(
                            body.state ?? body.State ?? body.stateName
                        )
                        : existing.state,

                country:
                    body.country !== undefined ||
                        body.Country !== undefined ||
                        body.countryName !== undefined ||
                        body.CountryName !== undefined
                        ? optionalString(
                            body.country ??
                            body.Country ??
                            body.countryName ??
                            body.CountryName
                        ) || "Nigeria"
                        : existing.country || "Nigeria",

                customerType:
                    body.customerType !== undefined ||
                        body.CustomerType !== undefined
                        ? optionalString(
                            body.customerType ?? body.CustomerType
                        ) || "Retail"
                        : existing.customerType || "Retail",

                accountBalance:
                    body.accountBalance !== undefined ||
                        body.AccountBalance !== undefined
                        ? Number(
                            body.accountBalance ?? body.AccountBalance ?? 0
                        ) || 0
                        : existing.accountBalance ?? 0,

                status:
                    body.status !== undefined || body.Status !== undefined
                        ? optionalString(body.status ?? body.Status) || "Active"
                        : existing.status || "Active",
            };

            const updated = await Customer.findOneAndUpdate(
                { customerId },
                { $set: updateData },
                {
                    new: true,
                    runValidators: true,
                }
            ).lean();

            if (!updated) {
                res.status(404).json({
                    success: false,
                    message: "Customer not found after update",
                });
                return;
            }

            const authenticatedUserId = clean(req.user?.userId);

            try {
                await createAuditLog({
                    userId: authenticatedUserId,
                    action: "UPDATE",
                    module: "Customers",
                    recordId: customerId,
                    description: `Customer ${updated.customerName} (${customerId}) was updated.`,
                    ipAddress: req.ip,
                });
            } catch (auditError) {
                console.error("Failed to create customer audit log:", auditError);
            }

            res.json({
                success: true,
                message: "Customer updated successfully",
                data: customerResponse(updated),
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
 */
router.patch(
    "/:id/archive",
    authenticate,
    requirePermission("customers.update"),
    async (req: AuthenticatedRequest, res, next) => {
        try {
            const customerId = clean(req.params.id);

            const customer = await Customer.findOneAndUpdate(
                { customerId },
                { $set: { status: "Archived" } },
                { new: true, runValidators: true }
            ).lean();

            if (!customer) {
                res.status(404).json({
                    success: false,
                    message: "Customer not found",
                });
                return;
            }

            const authenticatedUserId = clean(req.user?.userId);

            try {
                await createAuditLog({
                    userId: authenticatedUserId,
                    action: "ARCHIVE",
                    module: "Customers",
                    recordId: customerId,
                    description: `Customer ${customer.customerName} (${customerId}) was archived.`,
                    ipAddress: req.ip,
                });
            } catch (auditError) {
                console.error("Failed to create customer archive audit log:", auditError);
            }

            res.json({
                success: true,
                message: "Customer archived successfully",
                data: customerResponse(customer),
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
