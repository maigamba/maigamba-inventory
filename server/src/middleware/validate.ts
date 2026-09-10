import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType) {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (!result.success) {
            const issues = result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            }));

            res.status(400).json({
                success: false,
                message: "Invalid request data.",
                errors: issues,
            });

            return;
        }

        const validated = result.data as {
            body?: unknown;
            query?: unknown;
            params?: unknown;
        };

        if (validated.body !== undefined) {
            req.body = validated.body;
        }

        if (validated.query !== undefined) {
            Object.keys(req.query).forEach((key) => {
                delete req.query[key];
            });

            Object.assign(req.query, validated.query);
        }

        if (validated.params !== undefined) {
            Object.keys(req.params).forEach((key) => {
                delete req.params[key];
            });

            Object.assign(req.params, validated.params);
        }

        next();
    };
}
