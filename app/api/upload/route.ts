import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  const queryType: string = req.nextUrl.searchParams.get("type") ?? "none";

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
    const files = formData.getAll('file') as unknown as File[] | null;
    if (files === null) {
      return NextResponse.json({
        error: "No file provided"
      }, {
        status: 400,
        headers: corsHeaders,
      })
    }

    let file = null;
    // we get the last file uploaded due to... reasons
    // (filepond uploads metadata first, and we only want the last one)
    for (const f of files) {
      file = f;
    }
    if (file === null) {
      return NextResponse.json({
        error: "No file found"
      }, {
        status: 400,
        headers: corsHeaders,
      })
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const key = createHash('sha256').update(buf).digest('hex');

    let invalidFile = false;
    switch (queryType) {
      case "bgimg": {
        if (
          // jpg
          ! buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) &&
          // png
          ! buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ) {
          invalidFile = true;
        }
        break;
      }
      case "vrm": {
        if (! buf.subarray(0, 4).equals(Buffer.from([0x67, 0x6c, 0x54, 0x46]))) {
          invalidFile = true;
        }
        break;
      }
      default: {
        invalidFile = true;
        break;
      }
    }

    if (invalidFile) {
      return NextResponse.json({
        error: "Invalid file type"
      }, {
        status: 400,
        headers: corsHeaders,
      });
    }

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
        headers: corsHeaders,
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
      type: queryType,
      hash: key,
    })

    if (error) {
      return NextResponse.json({
        error: "Database inaccessible"
      }, {
        status: 500,
        headers: corsHeaders,
      });
    }
  
    const response = await client.send(uploadCommand);
    return NextResponse.json({
       message: "File uploaded successfully",
       key,
       response,
     }, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}
