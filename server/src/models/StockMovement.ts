import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStockMovement extends Document {
    movementId: string;
    productId: string;
    movementType: string;
    quantity: number;
    referenceId?: string;
    reason?: string;
    previousQuantity: number;
    newQuantity: number;
    createdBy: string;
    movementDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
    {
        movementId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        productId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        movementType: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
        },

        referenceId: {
            type: String,

            trim: true,
            default: undefined,
        },

        reason: {
            type: String,
            trim: true,
            default: undefined,
        },

        previousQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        newQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        createdBy: {
            type: String,
            required: true,
            trim: true,
        },

        movementDate: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "stockMovements",
    }
);

stockMovementSchema.index({
    productId: 1,
    movementDate: -1,
});

stockMovementSchema.index({
    movementType: 1,
    movementDate: -1,
});

stockMovementSchema.index({
    referenceId: 1,
});

stockMovementSchema.index({
    createdBy: 1,
});

const StockMovement: Model<IStockMovement> =
    mongoose.models.StockMovement ||
    mongoose.model<IStockMovement>(
        "StockMovement",
        stockMovementSchema
    );

export default StockMovement;
