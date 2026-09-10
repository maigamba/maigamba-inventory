import Product from "../models/Product";
import StockMovement from "../models/StockMovement";
import User from "../models/User";
import { generateMongoId } from "../utils/mongoId";

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

    const adjustmentType = String(
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

    /*
     * Find the staff account in MongoDB.
     */
    const staff = await User.findOne({
        userId: staffId,
    })
        .select(
            "userId fullName status"
        )
        .lean();

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

    /*
     * MongoDB transaction.
     *
     * The product quantity update and
     * stock movement creation happen together.
     */
    const mongoose = (
        await import("mongoose")
    ).default;

    const session =
        await mongoose.startSession();

    try {
        let updatedProduct: any = null;

        await session.withTransaction(
            async () => {
                const product =
                    await Product.findOne({
                        productId,
                    }).session(session);

                if (!product) {
                    throw new Error(
                        `Product not found: ${productId}`
                    );
                }

                const previousQuantity =
                    Number(
                        product.quantity
                    );

                let newQuantity: number;

                if (type === "IN") {
                    newQuantity =
                        previousQuantity +
                        quantity;
                } else {
                    newQuantity =
                        previousQuantity -
                        quantity;

                    if (newQuantity < 0) {
                        throw new Error(
                            `Insufficient stock for ${product.productName}. Available: ${previousQuantity}`
                        );
                    }
                }

                product.quantity =
                    newQuantity;

                await product.save({
                    session,
                });

                /*
                 * Create stock movement.
                 *
                 * MongoDB model uses createdBy,
                 * while the API historically used staffId.
                 */
                await StockMovement.create(
                    [
                        {
                            movementId:
                                generateMongoId(
                                    "MOV"
                                ),

                            productId,

                            movementType:
                                adjustmentType,

                            quantity,

                            previousQuantity,

                            newQuantity,

                            referenceId:
                                `ADJ-${Date.now()}`,

                            reason,

                            createdBy:
                                staff.userId,

                            movementDate:
                                new Date(),
                        },
                    ],
                    {
                        session,
                    }
                );

                updatedProduct =
                    product.toObject();
            }
        );

        return updatedProduct;
    } finally {
        await session.endSession();
    }
}

export default adjustStock;