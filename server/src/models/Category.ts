import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
    categoryId: string;
    name: string;
    description?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        categoryId: {
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
        collection: "categories",
    }
);

categorySchema.index({
    name: 1,
});

categorySchema.index({
    status: 1,
});

const Category: Model<ICategory> =
    mongoose.models.Category ||
    mongoose.model<ICategory>(
        "Category",
        categorySchema
    );

export default Category;
