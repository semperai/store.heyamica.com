import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req: NextRequest) {
  try {
    const client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_REGION
    })

    const formData = await req.formData()
    const file = formData.get('file') as unknown as File | null;
    if (file === null) {
      return NextResponse.json(null, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const key = createHash('sha256').update(buf).digest('hex');

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buf,
    });
  
    const response = await client.send(uploadCommand);
    return NextResponse.json({
       message: "File uploaded successfully",
       key,
       response,
     });
  } catch (error: any) {
    return NextResponse.json({ error: error.message })
  }
}
