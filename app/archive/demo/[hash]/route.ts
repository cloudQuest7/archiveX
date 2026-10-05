import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const hash = params.hash;
  const searchParams = request.nextUrl.searchParams;
  const originalUrl = searchParams.get("url") || "(not provided)";
  const capturedAt = new Date().toISOString();

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock Archive Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #fafafa;
      color: #111;
      min-height: 100vh;
    }
    .banner {
      background: linear-gradient(90deg, #fef3c7, #fde68a);
      border-bottom: 1px solid #fcd34d;
      padding: 14px 20px;
      font-size: 14px;
      color: #92400e;
      text-align: center;
      font-weight: 500;
    }
    .wrap { max-width: 860px; margin: 40px auto; padding: 0 20px; }
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 28px 32px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
    .sub { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    .row { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-top: 1px solid #f3f4f6; }
    .row:first-of-type { border-top: none; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; font-weight: 600; }
    .value { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #111827; word-break: break-all; }
    .value a { color: #2563eb; text-decoration: none; }
    .value a:hover { text-decoration: underline; }
    .tag { display: inline-block; background: #fef9c3; color: #854d0e; border: 1px solid #fde047; font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: 8px; font-weight: 600; }
    footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="banner">
    This is a simulated archive page for local DEVELOPMENT / DEMO use only. Not a real web archive snapshot.
  </div>
  <div class="wrap">
    <div class="card">
      <h1>Mock Archive Demo <span class="tag">DEVELOPMENT</span></h1>
      <div class="sub">This is a placeholder served by the Development Provider. No real archiving occurred.</div>
      <div class="row">
        <div class="label">Hashed Identifier</div>
        <div class="value">mock-${hash}</div>
      </div>
      <div class="row">
        <div class="label">Archive Hash</div>
        <div class="value">${hash}</div>
      </div>
      <div class="row">
        <div class="label">Original URL</div>
        <div class="value"><a href="${originalUrl}" rel="noreferrer noopener" target="_blank">${originalUrl}</a></div>
      </div>
      <div class="row">
        <div class="label">Provider</div>
        <div class="value">Development Provider (MOCK)</div>
      </div>
      <div class="row">
        <div class="label">Captured At</div>
        <div class="value">${capturedAt}</div>
      </div>
    </div>
    <footer>ARCHIVE Development Mock Archive Route</footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
