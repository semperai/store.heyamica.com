import { createHash } from 'crypto';
import express, { Request, Response } from "express";
import 'dotenv/config'
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import Sqids from 'sqids';
import cors from 'cors';
import multer from 'multer';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer();

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("This site available at https://github.com/semperai/store.heyamica.com");
});

app.post(
  "/api/upload",
  upload.any(), //fields([{ name: 'files' }]),
  async (req: Request, res: Response) => {

  const queryType = req.query.type as string ?? "none";

  res.setHeader("Content-Type", "application/json");

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_KEY as string,
  );

  try {
    const client = new S3Client({
      endpoint: process.env.AWS_ENDPOINT,
      region: process.env.AWS_REGION
    });

    
    // @ts-ignore
    console.log('req', req);
    console.log('req.files', req.files);
    const files = req.files as unknown as File[] | null;
    console.log('files', files);
    if (files === null) {
      res.status(400);
      res.json({ error: "No file provided" });
      return;
    }

    let file = null;
    // we get the last file uploaded due to... reasons
    // (filepond uploads metadata first, and we only want the last one)
    for (const f of files) {
      file = f;
    }
    if (file === null) {
      res.status(400);
      res.json({ error: "No file found" });
      return;
    }

    const buf = Buffer.from(file.buffer);
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
      case "voice": {
        if (
          // tagged mp3
          ! buf.subarray(0, 3).equals(Buffer.from([0x49, 0x44, 0x33])) &&
          // untagged mp3
          ! buf.subarray(0, 2).equals(Buffer.from([0xff, 0xfb])) &&
          // wav
          ! buf.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46]))
        ) {
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
      res.status(400);
      res.json({ error: "Invalid file type" });
      return;
    }

    // first we see if object exists
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    try {
      const response = await client.send(headCommand);
      res.status(200);
      res.json({
        message: "File already exists",
        key,
        response,
      });
      return;
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
      res.status(500);
      res.json({ error: "Database inaccessible" });
      return;
    }
  
    const response = await client.send(uploadCommand);
    res.status(201);
    res.json({
       message: "File uploaded successfully",
       key,
       response,
    });
    return;
  } catch (error: any) {
    res.status(500);
    res.json({ error: error.message });
    return;
  }
});


app.post("/api/add_character", async (req: Request, res: Response) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_KEY as string,
    );

    const { data, count, error: countError } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true });

    if (countError) {
      res.status(500);
      res.json({ error: "Database inaccessible" });
      return;
    }

    const {
      name,
      system_prompt,
      vision_system_prompt,
      bg_url,
      youtube_videoid,
      vrm_url,
      animation_url,
      voice_url,
    } = req.body;

    const sqid = (new Sqids({ minLength: 10 })).encode([count as number]);

    const { error: insertError } = await supabase
      .from("characters")
      .insert({
        sqid,
        name,
        system_prompt,
        vision_system_prompt,
        bg_url,
        youtube_videoid,
        vrm_url,
        animation_url,
        voice_url,
      });

    if (insertError) {
      res.status(500);
      res.json({ error: "Database inaccessible" });
      return;
    }

    res.status(201);
    res.json({
      message: "character created",
      sqid,
    });
    return;

  } catch (error: any) {
    res.status(500);
    res.json({ error: error.message });
    return;
  }
});

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Listening on port ${process.env.PORT ?? 3000}`);
  console.log(process.env.AWS_BUCKET_NAME);
});
