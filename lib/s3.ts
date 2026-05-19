import { S3Client } from "@aws-sdk/client-s3"

export const s3Client = new S3Client({
  region: "sgp1",
  endpoint: `https://${process.env.S3_HOST}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: false,
})
