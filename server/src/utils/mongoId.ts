export function generateMongoId(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();

    const random = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
}
