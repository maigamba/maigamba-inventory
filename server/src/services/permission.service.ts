import Permission from "../models/Permission";
import User from "../models/User";
import UserPermission from "../models/UserPermission";
import { generateMongoId } from "../utils/mongoId";

/**
 * ============================================================
 * MAIGAMBA INVENTORY - PERMISSION SERVICE
 * MongoDB / Mongoose version
 * ============================================================
 */

export interface PermissionDefinition {
    code: string;
    name: string;
    description: string;
    module: string;
}

/**
 * All system permissions.
 *
 * Keep these codes synchronized with the permissions already
 * used throughout the application's routes.
 */
export const PERMISSIONS: PermissionDefinition[] = [
    // Products
    {
        code: "products.view",
        name: "View Products",
        description: "View products and product information",
        module: "Products",
    },
    {
        code: "products.create",
        name: "Create Products",
        description: "Create new products",
        module: "Products",
    },
    {
        code: "products.update",
        name: "Update Products",
        description: "Update existing products",
        module: "Products",
    },
    {
        code: "products.delete",
        name: "Delete Products",
        description: "Delete products",
        module: "Products",
    },

    // Categories
    {
        code: "categories.view",
        name: "View Categories",
        description: "View product categories",
        module: "Categories",
    },
    {
        code: "categories.manage",
        name: "Manage Categories",
        description: "Create, update, archive and delete categories",
        module: "Categories",
    },

    // Brands
    {
        code: "brands.view",
        name: "View Brands",
        description: "View product brands",
        module: "Brands",
    },
    {
        code: "brands.manage",
        name: "Manage Brands",
        description: "Create, update, archive and delete brands",
        module: "Brands",
    },

    // Suppliers
    {
        code: "suppliers.view",
        name: "View Suppliers",
        description: "View suppliers",
        module: "Suppliers",
    },
    {
        code: "suppliers.create",
        name: "Create Suppliers",
        description: "Create new suppliers",
        module: "Suppliers",
    },
    {
        code: "suppliers.update",
        name: "Update Suppliers",
        description: "Update suppliers",
        module: "Suppliers",
    },
    {
        code: "suppliers.delete",
        name: "Delete Suppliers",
        description: "Delete suppliers",
        module: "Suppliers",
    },

    // Customers
    {
        code: "customers.view",
        name: "View Customers",
        description: "View customers",
        module: "Customers",
    },
    {
        code: "customers.create",
        name: "Create Customers",
        description: "Create new customers",
        module: "Customers",
    },
    {
        code: "customers.update",
        name: "Update Customers",
        description: "Update customers",
        module: "Customers",
    },
    {
        code: "customers.delete",
        name: "Delete Customers",
        description: "Delete customers",
        module: "Customers",
    },

    // Sales
    {
        code: "sales.view",
        name: "View Sales",
        description: "View sales and sales history",
        module: "Sales",
    },
    {
        code: "sales.create",
        name: "Create Sales",
        description: "Create new sales",
        module: "Sales",
    },
    {
        code: "sales.update",
        name: "Update Sales",
        description: "Update sales",
        module: "Sales",
    },
    {
        code: "sales.delete",
        name: "Delete Sales",
        description: "Delete sales",
        module: "Sales",
    },

    // Purchases
    {
        code: "purchases.view",
        name: "View Purchases",
        description: "View purchases and purchase history",
        module: "Purchases",
    },
    {
        code: "purchases.create",
        name: "Create Purchases",
        description: "Create new purchases",
        module: "Purchases",
    },
    {
        code: "purchases.update",
        name: "Update Purchases",
        description: "Update purchases",
        module: "Purchases",
    },
    {
        code: "purchases.delete",
        name: "Delete Purchases",
        description: "Delete purchases",
        module: "Purchases",
    },

    // Expenses
    {
        code: "expenses.view",
        name: "View Expenses",
        description: "View business expenses",
        module: "Expenses",
    },
    {
        code: "expenses.create",
        name: "Create Expenses",
        description: "Create new expenses",
        module: "Expenses",
    },
    {
        code: "expenses.update",
        name: "Update Expenses",
        description: "Update expenses",
        module: "Expenses",
    },
    {
        code: "expenses.delete",
        name: "Delete Expenses",
        description: "Delete expenses",
        module: "Expenses",
    },

    // Returns
    {
        code: "returns.view",
        name: "View Returns",
        description: "View returned products",
        module: "Returns",
    },
    {
        code: "returns.create",
        name: "Create Returns",
        description: "Process product returns",
        module: "Returns",
    },
    {
        code: "returns.update",
        name: "Update Returns",
        description: "Update return records",
        module: "Returns",
    },

    // Stock
    {
        code: "stock.view",
        name: "View Stock",
        description: "View stock information",
        module: "Stock",
    },
    {
        code: "stock.adjust",
        name: "Adjust Stock",
        description: "Adjust product stock quantities",
        module: "Stock",
    },
    {
        code: "stock.movements",
        name: "View Stock Movements",
        description: "View stock movement history",
        module: "Stock",
    },

    // Reports
    {
        code: "reports.view",
        name: "View Reports",
        description: "View business reports and analytics",
        module: "Reports",
    },

    // Users
    {
        code: "users.view",
        name: "View Users",
        description: "View system users",
        module: "Users",
    },
    {
        code: "users.create",
        name: "Create Users",
        description: "Create new system users",
        module: "Users",
    },
    {
        code: "users.update",
        name: "Update Users",
        description: "Update system users",
        module: "Users",
    },
    {
        code: "users.delete",
        name: "Delete Users",
        description: "Delete system users",
        module: "Users",
    },
    {
        code: "users.permissions",
        name: "Manage User Permissions",
        description: "Grant and revoke user permissions",
        module: "Users",
    },

    // Settings
    {
        code: "settings.view",
        name: "View Settings",
        description: "View system settings",
        module: "Settings",
    },
    {
        code: "settings.manage",
        name: "Manage Settings",
        description: "Manage system settings",
        module: "Settings",
    },

    // Audit
    {
        code: "audit.view",
        name: "View Audit Logs",
        description: "View system audit logs",
        module: "Audit",
    },
];

/**
 * Role-based default permissions.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    Admin: PERMISSIONS.map((permission) => permission.code),

    Manager: [
        "dashboard.view",

        "products.view",
        "products.create",
        "products.update",

        "categories.view",
        "categories.manage",

        "brands.view",
        "brands.manage",

        "suppliers.view",
        "suppliers.create",
        "suppliers.update",

        "customers.view",
        "customers.create",
        "customers.update",

        "sales.view",
        "sales.create",
        "sales.update",

        "purchases.view",
        "purchases.create",
        "purchases.update",

        "expenses.view",
        "expenses.create",
        "expenses.update",

        "returns.view",
        "returns.create",
        "returns.update",

        "stock.view",
        "stock.adjust",
        "stock.movements",

        "reports.view",
        "audit.view",
    ],

    "Sales Staff": [
        "dashboard.view",

        "products.view",

        "customers.view",
        "customers.create",
        "customers.update",

        "sales.view",
        "sales.create",
        "sales.update",

        "returns.view",
        "returns.create",
    ],

    "Inventory Officer": [
        "dashboard.view",

        "products.view",
        "products.create",
        "products.update",

        "categories.view",
        "categories.manage",

        "brands.view",
        "brands.manage",

        "suppliers.view",
        "suppliers.create",
        "suppliers.update",

        "purchases.view",
        "purchases.create",
        "purchases.update",

        "stock.view",
        "stock.adjust",
        "stock.movements",

        "reports.view",
    ],
};

/**
 * Seed all permissions into MongoDB.
 *
 * Existing permissions are updated instead of duplicated.
 */
export async function seedPermissions() {
    let createdOrUpdated = 0;

    for (const permission of PERMISSIONS) {
        await Permission.findOneAndUpdate(
            { code: permission.code },
            {
                $set: {
                    name: permission.name,
                    description: permission.description,
                    module: permission.module,
                },
                $setOnInsert: {
                    permissionId: generateMongoId("PER"),
                },
            },
            {
                upsert: true,
                returnDocument: "after",
                setDefaultsOnInsert: true,
            }
        );

        createdOrUpdated++;
    }

    return {
        count: createdOrUpdated,
        message: "Permissions seeded successfully.",
    };
}

/**
 * Get the effective permissions for a user.
 *
 * Role permissions are applied first.
 * Direct user permissions can then grant or revoke permissions.
 */
export async function getUserPermissions(userId: string) {
    const normalizedUserId = String(userId || "").trim();

    if (!normalizedUserId) {
        throw new Error("User ID is required");
    }

    const user = await User.findOne({
        userId: normalizedUserId,
    }).lean();

    if (!user) {
        throw new Error("User not found");
    }

    const role = String(user.role || "").trim();
    const status = String(user.status || "").trim();

    const rolePermissions = new Set<string>(
        ROLE_PERMISSIONS[role] || []
    );

    const directPermissions = await UserPermission.find({
        userId: normalizedUserId,
    })
        .populate("permissionId")
        .lean();

    for (const record of directPermissions) {
        const permission = await Permission.findOne({
            permissionId: record.permissionId,
        }).lean();

        if (!permission) {
            continue;
        }

        if (record.granted) {
            rolePermissions.add(permission.code);
        } else {
            rolePermissions.delete(permission.code);
        }
    }

    return {
        userId: normalizedUserId,
        role,
        status,
        permissions: Array.from(rolePermissions).sort(),
    };
}

/**
 * Check whether a user has a specific permission.
 */
export async function hasPermission(
    userId: string,
    permissionCode: string
): Promise<boolean> {
    const normalizedPermission = String(
        permissionCode || ""
    ).trim();

    if (!normalizedPermission) {
        return false;
    }

    const result = await getUserPermissions(userId);

    if (result.status !== "Active") {
        return false;
    }

    if (result.role.toLowerCase() === "admin") {
        return true;
    }

    return result.permissions.includes(normalizedPermission);
}

/**
 * Grant a permission directly to a user.
 */
export async function grantUserPermission(
    userId: string,
    permissionCode: string
) {
    const normalizedUserId = String(userId || "").trim();
    const normalizedCode = String(permissionCode || "").trim();

    const user = await User.findOne({
        userId: normalizedUserId,
    }).lean();

    if (!user) {
        throw new Error("User not found");
    }

    const permission = await Permission.findOne({
        code: normalizedCode,
    }).lean();

    if (!permission) {
        throw new Error(
            `Permission "${normalizedCode}" does not exist`
        );
    }

    const userPermission = await UserPermission.findOneAndUpdate(
        {
            userId: normalizedUserId,
            permissionId: permission.permissionId,
        },
        {
            $set: {
                granted: true,
            },
            $setOnInsert: {
                userPermissionId: generateMongoId("UPR"),
            },
        },
        {
            upsert: true,
            returnDocument: "after",
        }
    ).lean();

    return {
        granted: true,
        message: "Permission granted successfully",
        userPermission,
    };
}

/**
 * Revoke a permission directly from a user.
 */
export async function revokeUserPermission(
    userId: string,
    permissionCode: string
) {
    const normalizedUserId = String(userId || "").trim();
    const normalizedCode = String(permissionCode || "").trim();

    const user = await User.findOne({
        userId: normalizedUserId,
    }).lean();

    if (!user) {
        throw new Error("User not found");
    }

    const permission = await Permission.findOne({
        code: normalizedCode,
    }).lean();

    if (!permission) {
        throw new Error(
            `Permission "${normalizedCode}" does not exist`
        );
    }

    const userPermission = await UserPermission.findOneAndUpdate(
        {
            userId: normalizedUserId,
            permissionId: permission.permissionId,
        },
        {
            $set: {
                granted: false,
            },
            $setOnInsert: {
                userPermissionId: generateMongoId("UPR"),
            },
        },
        {
            upsert: true,
            returnDocument: "after",
        }
    ).lean();

    return {
        revoked: true,
        message: "Permission revoked successfully",
        userPermission,
    };
}

/**
 * Set a user's direct permissions.
 *
 * The selected permissions become granted=true.
 * All other system permissions become granted=false.
 */
export async function setUserPermissions(
    userId: string,
    permissionCodes: string[]
) {
    const normalizedUserId = String(userId || "").trim();

    const user = await User.findOne({
        userId: normalizedUserId,
    }).lean();

    if (!user) {
        throw new Error("User not found");
    }

    const normalizedCodes = Array.from(
        new Set(
            (Array.isArray(permissionCodes)
                ? permissionCodes
                : []
            )
                .map((code) => String(code || "").trim())
                .filter(Boolean)
        )
    );

    const permissions = await Permission.find({
        code: {
            $in: normalizedCodes,
        },
    }).lean();

    const foundCodes = new Set(
        permissions.map((permission) => permission.code)
    );

    const unknownCodes = normalizedCodes.filter(
        (code) => !foundCodes.has(code)
    );

    if (unknownCodes.length > 0) {
        throw new Error(
            `Unknown permission(s): ${unknownCodes.join(", ")}`
        );
    }

    const allPermissions = await Permission.find({})
        .select("permissionId code")
        .lean();

    for (const permission of allPermissions) {
        const shouldBeGranted = normalizedCodes.includes(
            permission.code
        );

        await UserPermission.findOneAndUpdate(
            {
                userId: normalizedUserId,
                permissionId: permission.permissionId,
            },
            {
                $set: {
                    granted: shouldBeGranted,
                },
                $setOnInsert: {
                    userPermissionId: generateMongoId("UPR"),
                },
            },
            {
                upsert: true,
                returnDocument: "after",
            }
        );
    }

    return getUserPermissions(normalizedUserId);
}
