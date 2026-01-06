import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  context: { params?: { username?: string } | Promise<{ username?: string }> }
) {
  // Unwrap params if Next provided a Promise
  const paramsObj = context?.params ? await context.params : undefined;
  let username = paramsObj?.username;

  // Fallback to query param ?u=...
  if (!username) {
    try {
      const url = new URL(req.url);
      username = url.searchParams.get('u') || undefined;
    } catch {
      username = undefined;
    }
  }

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  const cleanUsername = decodeURIComponent(String(username).trim()).replace(/^\/+/, '');

  try {
    const upstream = `https://torre.ai/api/genome/bios/${encodeURIComponent(cleanUsername)}`;
    const res = await fetch(upstream, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Upstream request failed', details: String(err) },
      { status: 502 }
    );
  }
}