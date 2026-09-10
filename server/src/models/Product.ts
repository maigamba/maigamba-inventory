import mongoose, { Model, Schema } from "mongoose";

export interface IProduct {
    productId: string;
    sku: string;
    productName: string;
    categoryId: string;
    brandId: string;
    model?: string;
    serialNumber?: string;
    description?: string;
    quantity: number;
    reorderLevel: number;
    costPrice: number;
    sellingPrice: number;
    supplierId?: string;
    location?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
    {
        productId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        sku: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        productName: {
            type: String,
            required: true,
            trim: true,
        },

        categoryId: {
            type: String,
            required: true,

            trim: true,
        },

        brandId: {
            type: String,
            required: true,

            trim: true,
        },

        model: {
            type: String,
            trim: true,
            default: undefined,
        },

        serialNumber: {
            type: String,
            trim: true,
            default: undefined,
        },

        description: {
            type: String,
            trim: true,
            default: undefined,
        },

        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        reorderLevel: {
            type: Number,
            required: true,
            default: 5,
            min: 0,
        },

        costPrice: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        sellingPrice: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        supplierId: {
            type: String,

            trim: true,
            default: undefined,
        },

        location: {
            type: String,
            trim: true,
            default: undefined,
        },

        status: {
            type: String,
            required: true,
            default: "Active",

            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "products",
    }
);

/*
 * Search and filtering indexes
 */
productSchema.index({
    productName: 1,
});

productSchema.index({
    categoryId: 1,
});

productSchema.index({
    brandId: 1,
});

productSchema.index({
    supplierId: 1,
});

productSchema.index({
    status: 1,
});

productSchema.index({
    location: 1,
});

/*
 * Common inventory query
 */
productSchema.index({
    status: 1,
    quantity: 1,
});

/*
 * Serial number search
 */
productSchema.index({
    serialNumber: 1,
});

const Product: Model<IProduct> =
    mongoose.models.Product ||
    mongoose.model<IProduct>(
        "Product",
        productSchema
    );

export default Product;
