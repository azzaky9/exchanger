import { NextRequest } from "next/server"
import { withErrorHandler, badRequest, successResponse } from "@/lib/api-response"
import { s3Client } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { prisma } from "@/lib/prisma"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const formData = await req.formData()
    const transactionIdStr = formData.get("transactionId") as string
    const file = formData.get("file") as File | null

    if (!transactionIdStr) {
        return badRequest("transactionId is required")
    }
    if (!file) {
        return badRequest("No file uploaded")
    }

    const transactionId = parseInt(transactionIdStr, 10)
    if (isNaN(transactionId)) {
        return badRequest("Invalid transactionId")
    }

    // 1. Convert file object to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Generate unique key under S3_ROOT_PATH
    const rootPath = process.env.S3_ROOT_PATH || "spinzopay_v2"
    const uniqueId = crypto.randomUUID()
    const extension = file.name.split(".").pop() || "png"
    const key = `${rootPath}/invoices/${transactionId}/${uniqueId}.${extension}`

    // 3. Upload to S3-compatible bucket
    const bucketName = process.env.S3_BUCKET || ""
    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            ACL: "public-read",
        })
    )

    // 4. Construct public URL using S3_HOST_BUCKET
    const hostBucket = process.env.S3_HOST_BUCKET || `${bucketName}.${process.env.S3_HOST}`
    const fileUrl = `https://${hostBucket}/${key}`

    // 5. Create media record in Database
    const mediaRecord = await prisma.media.create({
        data: {
            alt: `Invoice for transaction ${transactionId}`,
            url: fileUrl,
            filename: file.name,
            mime_type: file.type,
            filesize: file.size,
        },
    })

    // 6. Update transaction to link the media record ID
    await prisma.transactions.update({
        where: { id: transactionId },
        data: {
            invoice_image_id: mediaRecord.id,
        },
    })

    return successResponse({ fileUrl }, "Invoice uploaded successfully")
})