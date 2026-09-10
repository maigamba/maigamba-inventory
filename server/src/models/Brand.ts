import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBrand extends Document {
    brandId: string;
    name: string;
    description?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
    {
        brandId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
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
        collection: "brands",
    }
);

brandSchema.index({
    name: 1,
});

brandSchema.index({
    status: 1,
});

const Brand: Model<IBrand> =
    mongoose.models.Brand ||
    mongoose.model<IBrand>(
        "Brand",
        brandSchema
    );

export default Brand;
