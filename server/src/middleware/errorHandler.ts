import { Request, Response, NextFunction } from "express";

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error(error);

    res.status(500).json({
        success: false,
        message:
            error instanceof Error
                ? error.message
                : "Internal server error",
    });
}
