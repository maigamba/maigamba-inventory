import { prisma } from "../config/database";
import { generateId } from "../utils/ids";

export const PERMISSIONS = [
    {
        code: "dashboard.view",
        name: "View Dashboard",
        description: "Access the dashboard",
        module: "Dashboard",
    },

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
        description: "Add new products",
        module: "Products",
    },
    {
        code: "products.update",
        name: "Update Products",
        description: "Edit products",
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
        description: "Create, update and delete categories",
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
        description: "Create, update and delete brands",
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
        description: "Add suppliers",
        module: "Suppliers",
    },
    {
        code: "suppliers.update",
        name: "Update Suppliers",
        description: "Edit suppliers",
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
        description: "Add customers",
        module: "Customers",
    },
    {
        code: "customers.update",
        name: "Update Customers",
        description: "Edit customers",
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
        description: "Create and complete sales",
        module: "Sales",
    },
    {
        code: "sales.update",
        name: "Update Sales",
        description: "Edit sales",
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
        description: "View purchases",
        module: "Purchases",
    },
    {
        code: "purchases.create",
        name: "Create Purchases",
        description: "Create purchases",
        module: "Purchases",
    },
    {
        code: "purchases.update",
        name: "Update Purchases",
        description: "Edit purchases",
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
        description: "View expenses",
        module: "Expenses",
    },
    {
        code: "expenses.create",
        name: "Create Expenses",
        description: "Record expenses",
        module: "Expenses",
    },
    {
        code: "expenses.update",
        name: "Update Expenses",
        description: "Edit expenses",
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
        description: "Process returns",
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
        description: "View stock levels",
        module: "Stock",
    },
    {
        code: "stock.adjust",
        name: "Adjust Stock",
        description: "Make stock adjustments",
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
        description: "Access business reports",
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
        description: "Create system users",
        module: "Users",
    },
    {
        code: "users.update",
        name: "Update Users",
        description: "Edit system users",
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
        description: "Grant and revoke individual permissions",
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
        description: "Change system settings",
        module: "Settings",
    },

    // Audit logs
    {
        code: "audit.view",
        name: "View Audit Logs",
        description: "View system audit logs",
        module: "Audit Logs",
    },
] as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
    Admin: PERMISSIONS.map(
        (permission) => permission.code
    ),

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


/*
|--------------------------------------------------------------------------
| SEED PERMISSIONS
|--------------------------------------------------------------------------
*/

export async function seedPermissions() {
    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: {
                code: permission.code,
            },

            update: {
                name: permission.name,
                description:
                    permission.description,
                module: permission.module,
            },

            create: {
                permissionId:
                    generateId("PER"),

                code: permission.code,

                name: permission.name,

                description:
                    permission.description,

                module: permission.module,
            },
        });
    }

    return prisma.permission.count();
}


/*
|--------------------------------------------------------------------------
| GET USER PERMISSIONS
|--------------------------------------------------------------------------
|
| Effective permission calculation:
|
| 1. Start with role permissions.
| 2. Load ALL direct user permission records,
|    including granted=false.
| 3. A direct "granted=true" overrides the role.
| 4. A direct "granted=false" removes the role permission.
|
*/

export async function getUserPermissions(
    userId: string
) {
    const user =
        await prisma.user.findUnique({
            where: {
                userId,
            },

            select: {
                userId: true,
                role: true,
                status: true,

                permissions: {
                    select: {
                        granted: true,

                        permission: {
                            select: {
                                code: true,
                            },
                        },
                    },
                },
            },
        });

    if (!user) {
        return {
            role: null,
            status: null,
            permissions: [],
        };
    }

    /*
    |--------------------------------------------------------------------------
    | Start with role permissions
    |--------------------------------------------------------------------------
    */

    const effectivePermissions =
        new Set(
            ROLE_PERMISSIONS[
            user.role
            ] ?? []
        );

    /*
    |--------------------------------------------------------------------------
    | Apply direct user overrides
    |--------------------------------------------------------------------------
    */

    for (
        const userPermission of
        user.permissions
    ) {
        const code =
            userPermission.permission
                .code;

        if (
            userPermission.granted
        ) {
            effectivePermissions.add(
                code
            );
        } else {
            effectivePermissions.delete(
                code
            );
        }
    }

    return {
        role: user.role,

        status: user.status,

        permissions:
            Array.from(
                effectivePermissions
            ),
    };
}


/*
|--------------------------------------------------------------------------
| CHECK PERMISSION
|--------------------------------------------------------------------------
*/

export async function hasPermission(
    userId: string,
    permission: string
): Promise<boolean> {
    const result =
        await getUserPermissions(
            userId
        );

    if (
        result.status !==
        "Active"
    ) {
        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    |
    | Admin keeps full system access.
    |
    */

    if (
        result.role === "Admin"
    ) {
        return true;
    }

    return result.permissions.includes(
        permission
    );
}


/*
|--------------------------------------------------------------------------
| GRANT INDIVIDUAL PERMISSION
|--------------------------------------------------------------------------
*/

export async function grantUserPermission(
    userId: string,
    permissionCode: string
) {
    const normalizedCode =
        String(
            permissionCode
        ).trim();

    if (!normalizedCode) {
        throw new Error(
            "Permission code is required"
        );
    }

    const user =
        await prisma.user.findUnique({
            where: {
                userId,
            },
        });

    if (!user) {
        throw new Error(
            "User not found"
        );
    }

    const permission =
        await prisma.permission.findUnique(
            {
                where: {
                    code: normalizedCode,
                },
            }
        );

    if (!permission) {
        throw new Error(
            `Permission not found: ${normalizedCode}`
        );
    }

    const userPermission =
        await prisma.userPermission.upsert(
            {
                where: {
                    userId_permissionId: {
                        userId,

                        permissionId:
                            permission.permissionId,
                    },
                },

                update: {
                    granted: true,
                },

                create: {
                    userPermissionId:
                        generateId("UPR"),

                    userId,

                    permissionId:
                        permission.permissionId,

                    granted: true,
                },

                include: {
                    permission: true,
                },
            }
        );

    return userPermission;
}


/*
|--------------------------------------------------------------------------
| REVOKE INDIVIDUAL PERMISSION
|--------------------------------------------------------------------------
*/

export async function revokeUserPermission(
    userId: string,
    permissionCode: string
) {
    const normalizedCode =
        String(
            permissionCode
        ).trim();

    if (!normalizedCode) {
        throw new Error(
            "Permission code is required"
        );
    }

    const user =
        await prisma.user.findUnique({
            where: {
                userId,
            },
        });

    if (!user) {
        throw new Error(
            "User not found"
        );
    }

    const permission =
        await prisma.permission.findUnique(
            {
                where: {
                    code: normalizedCode,
                },
            }
        );

    if (!permission) {
        throw new Error(
            `Permission not found: ${normalizedCode}`
        );
    }

    const userPermission =
        await prisma.userPermission.upsert(
            {
                where: {
                    userId_permissionId: {
                        userId,

                        permissionId:
                            permission.permissionId,
                    },
                },

                update: {
                    granted: false,
                },

                create: {
                    userPermissionId:
                        generateId("UPR"),

                    userId,

                    permissionId:
                        permission.permissionId,

                    granted: false,
                },

                include: {
                    permission: true,
                },
            }
        );

    return {
        revoked: true,

        message:
            "Permission revoked successfully",

        userPermission,
    };
}


/*
|--------------------------------------------------------------------------
| SET USER PERMISSIONS
|--------------------------------------------------------------------------
|
| Replaces all direct user permissions with
| the supplied list.
|
| Important:
| A permission not included in the list is
| stored as granted=false when it already has
| a direct permission record, and new direct
| records are created as false when needed.
|
*/

export async function setUserPermissions(
    userId: string,
    permissionCodes: string[]
) {
    const user =
        await prisma.user.findUnique({
            where: {
                userId,
            },
        });

    if (!user) {
        throw new Error(
            "User not found"
        );
    }

    const normalizedCodes =
        Array.from(
            new Set(
                permissionCodes
                    .map((code) =>
                        String(
                            code
                        ).trim()
                    )
                    .filter(Boolean)
            )
        );

    const permissions =
        await prisma.permission.findMany(
            {
                select: {
                    permissionId: true,
                    code: true,
                },
            }
        );

    const permissionByCode =
        new Map<
            string,
            {
                permissionId: string;
                code: string;
            }
        >();

    for (
        const permission of
        permissions
    ) {
        permissionByCode.set(
            permission.code,
            permission
        );
    }

    const invalidCodes =
        normalizedCodes.filter(
            (code) =>
                !permissionByCode.has(
                    code
                )
        );

    if (
        invalidCodes.length > 0
    ) {
        throw new Error(
            `Unknown permission(s): ${invalidCodes.join(", ")}`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Load all current direct records
    |--------------------------------------------------------------------------
    */

    const existing =
        await prisma.userPermission.findMany(
            {
                where: {
                    userId,
                },

                select: {
                    userPermissionId:
                        true,

                    permissionId:
                        true,

                    granted:
                        true,

                    permission: {
                        select: {
                            code: true,
                        },
                    },
                },
            }
        );

    const selectedSet =
        new Set(
            normalizedCodes
        );

    const existingByCode =
        new Map<
            string,
            {
                userPermissionId: string;
                permissionId: string;
                granted: boolean;
            }
        >();

    for (
        const item of existing
    ) {
        existingByCode.set(
            item.permission.code,
            {
                userPermissionId:
                    item.userPermissionId,

                permissionId:
                    item.permissionId,

                granted:
                    item.granted,
            }
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Apply direct state to every permission
    |--------------------------------------------------------------------------
    */

    await prisma.$transaction(
        async (tx) => {
            for (
                const permission of
                permissions
            ) {
                const shouldGrant =
                    selectedSet.has(
                        permission.code
                    );

                const current =
                    existingByCode.get(
                        permission.code
                    );

                if (current) {
                    if (
                        current.granted !==
                        shouldGrant
                    ) {
                        await tx.userPermission.update(
                            {
                                where: {
                                    userPermissionId:
                                        current.userPermissionId,
                                },

                                data: {
                                    granted:
                                        shouldGrant,
                                },
                            }
                        );
                    }
                } else {
                    await tx.userPermission.create(
                        {
                            data: {
                                userPermissionId:
                                    generateId(
                                        "UPR"
                                    ),

                                userId,

                                permissionId:
                                    permission.permissionId,

                                granted:
                                    shouldGrant,
                            },
                        }
                    );
                }
            }
        }
    );

    return getUserPermissions(
        userId
    );
}