import { NextResponse } from 'next/server';

/**
 * Adds CORS headers to a response so that native clients (e.g. an Android app)
 * can reach the JSON API without a browser same-origin restriction.
 */
export function withCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

/** Handle pre-flight OPTIONS requests */
export function corsOptions(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
