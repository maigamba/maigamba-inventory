import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPermission extends Document {
    permissionId: string;
    code: string;
    name: string;
    description?: string;
    module: string;
    createdAt: Date;
    updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
    {
        permissionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        code: {
            type: String,
            required: true,
            unique: true,

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

        module: {
            type: String,
            required: true,

            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "permissions",
    }
);

permissionSchema.index({
    module: 1,
});

const Permission: Model<IPermission> =
    mongoose.models.Permission ||
    mongoose.model<IPermission>(
        "Permission",
        permissionSchema
    );

export default Permission;


