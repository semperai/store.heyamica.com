import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  try {
    const client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_REGION
    });

    const formData = await req.formData()
    const file = formData.get('file') as unknown as File | null;
    if (file === null) {
      return NextResponse.json(null, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const key = createHash('sha256').update(buf).digest('hex');

    // first we see if object exists
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    try {
      const response = await client.send(headCommand);
      return NextResponse.json({
        message: "File already exists",
        key,
        response,
      }, {
        status: 200,
      });
    } catch (error: any) {
      // if object does not exist, we upload it
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buf,
    });

    const { error } = await supabase.from("files").insert({
      type: "vrm",
      hash: key,
    })
  
    const response = await client.send(uploadCommand);
    return NextResponse.json({
       message: "File uploaded successfully",
       key,
       response,
     }, {
      status: 201,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message })
  }
}
