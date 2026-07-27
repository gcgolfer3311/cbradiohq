// netlify/functions/skip-spots.js
//
// Backend for the live "Skip Spots" crowdsourced board on the homepage.
// Stores recent spots in Netlify Blobs (no external database needed).
//
// GET  /api/skip-spots   -> returns spots from the last 3 hours, newest first
// POST /api/skip-spots   -> { channel, state, message, hp } adds a new spot
//
// Requires: `@netlify/blobs` (bundled automatically by Netlify — no
// separate install needed when deployed on Netlify's build system).

import { getStore } from "@netlify/blobs";

const MAX_SPOTS_STORED = 100;
const MAX_MESSAGE_LEN = 140;
const MAX_STATE_LEN = 20;
const WINDOW_MS = 3 * 60 * 60 * 1000; // only show spots newer than 3 hours

function sanitize(str, maxLen) {
  return String(str || "")
    .slice(0, maxLen)
    .replace(/[<>]/g, "");
}

export default async (req) => {
  const store = getStore("skip-spots");

  if (req.method === "GET") {
    const spots = (await store.get("recent", { type: "json" })) || [];
    const cutoff = Date.now() - WINDOW_MS;
    const recent = spots.filter((s) => s.ts > cutoff);
    return new Response(JSON.stringify(recent), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400 });
    }

    // Honeypot: bots fill hidden fields, real users never see this input.
    if (body.hp) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const channel = parseInt(body.channel, 10);
    const state = sanitize(body.state, MAX_STATE_LEN);
    const message = sanitize(body.message, MAX_MESSAGE_LEN);

    if (!channel || channel < 1 || channel > 40) {
      return new Response(JSON.stringify({ error: "Invalid channel" }), { status: 400 });
    }
    if (!state) {
      return new Response(JSON.stringify({ error: "State required" }), { status: 400 });
    }

    const spots = (await store.get("recent", { type: "json" })) || [];
    spots.unshift({ channel, state, message, ts: Date.now() });
    const trimmed = spots.slice(0, MAX_SPOTS_STORED);
    await store.setJSON("recent", trimmed);

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/skip-spots" };
