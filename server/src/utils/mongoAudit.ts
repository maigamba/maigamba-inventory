import AuditLog from "../models/AuditLog";
import { generateMongoId } from "./mongoId";

interface AuditLogOptions {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    description?: string;
    ipAddress?: string;
}

export async function createMongoAuditLog(
    options: AuditLogOptions
): Promise<void> {
    try {
        await AuditLog.create({
            logId: generateMongoId("LOG"),
            userId: options.userId,
            action: options.action,
            module: options.module,
            recordId: options.recordId,
            description: options.description,
            ipAddress: options.ipAddress,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error("Failed to create MongoDB audit log:", error);
    }
}