import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Sqids from 'sqids';

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
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_KEY as string,
    );

    const { data, count, error: countError } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json({
        error: "Database inaccessible"
      }, {
        status: 500,
        headers: corsHeaders,
      });
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
    } = await req.json();

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
      return NextResponse.json({
        error: "Database inaccessible"
      }, {
        status: 500,
        headers: corsHeaders,
      });
    }

    return NextResponse.json({
       message: "character created",
       sqid,
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
