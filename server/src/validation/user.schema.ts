import { z } from "zod";

// --------------------------------------------------
// Reusable fields
// --------------------------------------------------

const userIdParam = z
    .string()
    .trim()
    .min(1, "User ID is required")
    .max(100, "User ID is too long");

const fullName = z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name must be 150 characters or fewer");

const email = z
    .string()
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address")
    .max(255, "Email is too long");

const phone = z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional()
    .nullable();

const role = z.enum([
    "Admin",
    "Manager",
    "Sales Staff",
    "Inventory Officer",
]);

const status = z.enum([
    "Active",
    "Inactive",
]);

const password = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters");

// --------------------------------------------------
// CREATE USER
// --------------------------------------------------

export const createUserSchema = z.object({
    body: z.object({
        fullName,

        email,

        phone,

        role: role.default("Sales Staff"),

        status: status.default("Active"),

        password,
    }),
});

// --------------------------------------------------
// UPDATE USER
// --------------------------------------------------

export const updateUserSchema = z.object({
    params: z.object({
        id: userIdParam,
    }),

    body: z.object({
        fullName: fullName.optional(),

        email: email.optional(),

        phone,

        role: role.optional(),

        status: status.optional(),

        password: password.optional(),
    }),
});

// --------------------------------------------------
// USER ID
// --------------------------------------------------

export const userIdSchema = z.object({
    params: z.object({
        id: userIdParam,
    }),
});

// --------------------------------------------------
// UPDATE ALL USER PERMISSIONS
// --------------------------------------------------

export const updateUserPermissionsSchema = z.object({
    params: z.object({
        id: userIdParam,
    }),

    body: z.object({
        permissionCodes: z
            .array(
                z
                    .string()
                    .trim()
                    .min(1)
                    .max(100)
            )
            .max(
                200,
                "Too many permissions were supplied"
            ),
    }),
});

// --------------------------------------------------
// SINGLE PERMISSION
// --------------------------------------------------

export const singlePermissionSchema = z.object({
    params: z.object({
        id: userIdParam,
    }),

    body: z.object({
        permissionCode: z
            .string()
            .trim()
            .min(
                1,
                "Permission code is required"
            )
            .max(100, "Permission code is too long"),
    }),
});