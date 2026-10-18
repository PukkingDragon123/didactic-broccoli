// Shop codes: your save, deflated and base64url-encoded, so a friend can open a read-only copy of your shop.
const PREFIX = 'GG1.';

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = (s) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/** Encode a state object (settings and transient fields are left out). */
export async function encodeShop(state, name = '') {
  const s = { ...state, settings: undefined, loose: [], deliveries: [], __visit: undefined, __owner: name || state.__owner || '' };
  const json = new TextEncoder().encode(JSON.stringify(s));
  return PREFIX + toB64(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Decode a shop code back into a state object; throws on anything that isn't one. */
export async function decodeShop(code) {
  const c = String(code).trim().replace(/\s+/g, '');
  if (!c.startsWith(PREFIX)) throw new Error('not a shop code');
  const json = new TextDecoder().decode(await pipe(fromB64(c.slice(PREFIX.length)), new DecompressionStream('deflate-raw')));
  const s = JSON.parse(json);
  if (!s || !Array.isArray(s.machines)) throw new Error('broken shop code');
  return s;
}
