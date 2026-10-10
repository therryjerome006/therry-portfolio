const bucket = "talent-files";

function config() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  return { base, key };
}

export function stripJpegExif(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const parts: Buffer[] = [Buffer.from(buffer.subarray(0, 2))];
  let offset = 2;
  while (offset + 3 < buffer.length && buffer[offset] === 0xff) {
    const marker = buffer[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      parts.push(Buffer.from(buffer.subarray(offset)));
      return Buffer.concat(parts);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      parts.push(Buffer.from(buffer.subarray(offset, offset + 2)));
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const next = offset + 2 + length;
    if (length < 2 || next > buffer.length) break;
    if (marker !== 0xe1) parts.push(Buffer.from(buffer.subarray(offset, next)));
    offset = next;
  }
  return buffer;
}

export async function uploadTalentFile(path: string, body: Buffer, mime: string) {
  const { base, key } = config();
  if (!base || !key) throw new Error("stockage");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(path)) throw new Error("chemin");
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": mime,
      "cache-control": "private, max-age=0",
      "x-upsert": "false",
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) throw new Error("envoi");
}

export async function downloadTalentFile(path: string) {
  const { base, key } = config();
  if (!base || !key || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(path)) return null;
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    headers: { authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

export async function deleteTalentFile(path: string) {
  const { base, key } = config();
  if (!base || !key || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/i.test(path)) return;
  await fetch(`${base}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
}

export async function listTalentFiles(prefix: string) {
  const { base, key } = config();
  if (!base || !key) return [];
  const response = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 100, offset: 0 }),
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as { name?: string }[];
  return rows.map((row) => row.name).filter((name): name is string => Boolean(name));
}
