import AuditLog from "../models/AuditLog";
import { generateMongoId } from "../utils/mongoId";

interface AuditInput {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    description?: string;
    ipAddress?: string;
}

export async function createAuditLog(
    input: AuditInput
) {
    return AuditLog.create({
        logId: generateMongoId("LOG"),

        userId:
            input.userId ||
            undefined,

        action:
            input.action,

        module:
            input.module,

        recordId:
            input.recordId ||
            undefined,

        description:
            input.description ||
            undefined,

        ipAddress:
            input.ipAddress ||
            undefined,

        timestamp:
            new Date(),
    });
}