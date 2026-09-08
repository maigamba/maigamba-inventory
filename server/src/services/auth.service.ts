import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET is missing. Add a strong JWT_SECRET to your .env file."
    );
}

const JWT_EXPIRES_IN = "8h";
const JWT_ALGORITHM: jwt.Algorithm = "HS256";

export interface AuthUser {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
}

export async function loginUser(
    email: string,
    password: string
) {
    const normalizedEmail = String(email || "")
        .trim()
        .toLowerCase();

    const suppliedPassword = String(password || "");

    if (!normalizedEmail || !suppliedPassword) {
        throw new Error("Invalid email or password");
    }

    const user = await prisma.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    if (user.status !== "Active") {
        throw new Error("Invalid email or password");
    }

    const passwordValid = await bcrypt.compare(
        suppliedPassword,
        user.passwordHash
    );

    if (!passwordValid) {
        throw new Error("Invalid email or password");
    }

    const safeUser: AuthUser = {
        id: user.id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
    };

    const token = jwt.sign(
        {
            sub: user.id,
            userId: user.userId,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        {
            algorithm: JWT_ALGORITHM,
            expiresIn: JWT_EXPIRES_IN,
        }
    );

    return {
        user: safeUser,
        token,
        expiresIn: JWT_EXPIRES_IN,
    };
}