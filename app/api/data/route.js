import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "fw-family-data-v2";

export async function GET() {
  try {
    const data = await redis.get(KEY);
    return Response.json({ data: data || {} });
  } catch (e) {
    return Response.json({ data: {} }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { data } = await request.json();
    await redis.set(KEY, data);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false }, { status: 500 });
  }
}
