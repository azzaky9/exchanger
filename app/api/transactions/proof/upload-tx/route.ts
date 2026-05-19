import { successResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async () => {
    return successResponse({ message: "success" })
})