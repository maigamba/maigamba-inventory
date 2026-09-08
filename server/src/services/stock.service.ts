import { prisma } from "../config/database";
import { generateId } from "../utils/ids";

type AdjustStockInput = {
    ProductID?: string;
    productId?: string;
    quantity?: number | string;
    type?: string;
    adjustmentType?: string;
    reason?: string;
    staff?: string;
    staffId?: string;
};

export async function adjustStock(
    stockData: AdjustStockInput
) {
    const productId = String(
        stockData?.ProductID ??
        stockData?.productId ??
        ""
    ).trim();

    if (!productId) {
        throw new Error(
            "Product ID is required for stock adjustment."
        );
    }

    const quantity = Number(
        stockData?.quantity ?? 0
    );

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(
            "Quantity must be greater than zero."
        );
    }

    const type = String(
        stockData?.type ?? "IN"
    )
        .trim()
        .toUpperCase();

    if (type !== "IN" && type !== "OUT") {
        throw new Error(
            'Stock adjustment type must be "IN" or "OUT".'
        );
    }

    const adjustmentType =
        String(
            stockData?.adjustmentType ??
            (type === "OUT"
                ? "ADJUSTMENT_OUT"
                : "ADJUSTMENT_IN")
        ).trim();

    const reason =
        String(
            stockData?.reason ?? ""
        ).trim() ||
        "Manual stock adjustment";

    const staffId = String(
        stockData?.staffId ??
        stockData?.staff ??
        ""
    ).trim();

    if (!staffId) {
        throw new Error(
            "Staff user ID is required for stock adjustment."
        );
    }

    const staff = await prisma.user.findUnique({
        where: {
            userId: staffId,
        },
        select: {
            userId: true,
            fullName: true,
            status: true,
        },
    });

    if (!staff) {
        throw new Error(
            "Staff account was not found."
        );
    }

    if (
        String(staff.status).toLowerCase() !==
        "active"
    ) {
        throw new Error(
            "The staff account is not active."
        );
    }

    return prisma.$transaction(async (tx) => {
        const product =
            await tx.product.findUnique({
                where: {
                    productId,
                },
            });

        if (!product) {
            throw new Error(
                `Product not found: ${productId}`
            );
        }

        const previousQuantity =
            product.quantity;

        let newQuantity: number;

        if (type === "IN") {
            newQuantity =
                previousQuantity + quantity;
        } else {
            newQuantity =
                previousQuantity - quantity;

            if (newQuantity < 0) {
                throw new Error(
                    `Insufficient stock for ${product.productName}. Available: ${previousQuantity}`
                );
            }
        }

        const updatedProduct =
            await tx.product.update({
                where: {
                    productId,
                },
                data: {
                    quantity: newQuantity,
                },
            });

        await tx.stockMovement.create({
            data: {
                movementId:
                    generateId("MOV"),
                productId,
                movementType:
                    adjustmentType,
                quantity,
                previousQuantity,
                newQuantity,
                referenceId:
                    `ADJ-${Date.now()}`,
                reason,
                staffId:
                    staff.userId,
            },
        });

        return updatedProduct;
    });
}

export default adjustStock;