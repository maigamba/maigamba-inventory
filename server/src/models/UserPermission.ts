import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserPermission extends Document {
    userPermissionId: string;
    userId: string;
    permissionId: string;
    granted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userPermissionSchema =
    new Schema<IUserPermission>(
        {
            userPermissionId: {
                type: String,
                required: true,
                unique: true,
                index: true,
                trim: true,
            },

            userId: {
                type: String,
                required: true,
                index: true,
                trim: true,
            },

            permissionId: {
                type: String,
                required: true,
                index: true,
                trim: true,
            },

            granted: {
                type: Boolean,
                required: true,
                default: false,
            },
        },
        {
            timestamps: true,
            collection: "userPermissions",
        }
    );

userPermissionSchema.index(
    {
        userId: 1,
        permissionId: 1,
    },
    {
        unique: true,
    }
);

userPermissionSchema.index({
    userId: 1,
    granted: 1,
});

const UserPermission:
    Model<IUserPermission> =
    mongoose.models.UserPermission ||
    mongoose.model<IUserPermission>(
        "UserPermission",
        userPermissionSchema
    );

export default UserPermission;