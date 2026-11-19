export interface JSZipFileOptions {
  base64?: boolean;
}

export type JSZipOutputType = 'blob' | 'uint8array' | 'arraybuffer' | 'base64';

export interface JSZipGenerateOptions<T extends JSZipOutputType = 'blob'> {
  type?: T;
}

type ZipInputData = string | Uint8Array | ArrayBuffer | Blob;

interface ZipEntry {
  path: string;
  data: ZipInputData;
  base64: boolean;
}

interface ResolvedZipEntry {
  nameBytes: Uint8Array;
  payload: Uint8Array;
  crc: number;
  localHeaderOffset: number;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function decodeBase64ToBytes(raw: string): Uint8Array<ArrayBuffer> {
  const stripped = raw.trim().replace(/^data:[^;,]+(?:;[^,]*)?;base64,/i, '').replace(/\s+/g, '');
  if (!stripped) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  if (typeof atob === 'function') {
    const binary = atob(stripped);
    const buffer = new ArrayBuffer(binary.length);
    const out = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i) & 0xff;
    }
    return out;
  }
  const nodeBuf = Buffer.from(stripped, 'base64');
  const buffer = new ArrayBuffer(nodeBuf.byteLength);
  const out = new Uint8Array(buffer);
  out.set(nodeBuf);
  return out;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

async function resolvePayload(entry: ZipEntry): Promise<Uint8Array> {
  const { data, base64 } = entry;
  if (typeof data === 'string') {
    return base64 ? decodeBase64ToBytes(data) : new TextEncoder().encode(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Zero-dependency PKZIP archive builder using STORE (compression method 0)
 * with IEEE 802.3 CRC-32 checksums and UTF-8 filename flags.
 */
export class JSZip {
  private readonly entries = new Map<string, ZipEntry>();

  file(path: string, data: ZipInputData, opts?: JSZipFileOptions): this {
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
    if (!cleanPath) {
      throw new Error('ZIP entry path cannot be empty.');
    }
    this.entries.set(cleanPath, {
      path: cleanPath,
      data,
      base64: Boolean(opts?.base64),
    });
    return this;
  }

  generateAsync(): Promise<Blob>;
  generateAsync(options: { type: 'blob' }): Promise<Blob>;
  generateAsync(options: { type: 'uint8array' }): Promise<Uint8Array<ArrayBuffer>>;
  generateAsync(options: { type: 'arraybuffer' }): Promise<ArrayBuffer>;
  generateAsync(options: { type: 'base64' }): Promise<string>;
  async generateAsync(
    options?: JSZipGenerateOptions<JSZipOutputType>,
  ): Promise<Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string> {
    const encoder = new TextEncoder();
    const { dosTime, dosDate } = getDosDateTime(new Date());
    const UTF8_FLAG = 0x0800;

    const records: ResolvedZipEntry[] = [];
    let localSectionSize = 0;
    let centralDirSize = 0;

    for (const entry of this.entries.values()) {
      const nameBytes = encoder.encode(entry.path);
      const payload = await resolvePayload(entry);
      const crc = crc32(payload);
      records.push({
        nameBytes,
        payload,
        crc,
        localHeaderOffset: localSectionSize,
      });
      localSectionSize += 30 + nameBytes.byteLength + payload.byteLength;
      centralDirSize += 46 + nameBytes.byteLength;
    }

    const totalSize = localSectionSize + centralDirSize + 22;
    const buffer = new ArrayBuffer(totalSize);
    const out = new Uint8Array(buffer);
    const view = new DataView(buffer);

    let offset = 0;

    for (const rec of records) {
      const size = rec.payload.byteLength;
      const nameLen = rec.nameBytes.byteLength;

      // Local file header (PK\x03\x04)
      view.setUint32(offset, 0x04034b50, true);
      view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, UTF8_FLAG, true);
      view.setUint16(offset + 8, 0, true);
      view.setUint16(offset + 10, dosTime, true);
      view.setUint16(offset + 12, dosDate, true);
      view.setUint32(offset + 14, rec.crc, true);
      view.setUint32(offset + 18, size, true);
      view.setUint32(offset + 22, size, true);
      view.setUint16(offset + 26, nameLen, true);
      view.setUint16(offset + 28, 0, true);
      out.set(rec.nameBytes, offset + 30);
      out.set(rec.payload, offset + 30 + nameLen);

      offset += 30 + nameLen + size;
    }

    const centralDirStart = offset;

    for (const rec of records) {
      const size = rec.payload.byteLength;
      const nameLen = rec.nameBytes.byteLength;

      // Central directory file header (PK\x01\x02)
      view.setUint32(offset, 0x02014b50, true);
      view.setUint16(offset + 4, 20, true);
      view.setUint16(offset + 6, 20, true);
      view.setUint16(offset + 8, UTF8_FLAG, true);
      view.setUint16(offset + 10, 0, true);
      view.setUint16(offset + 12, dosTime, true);
      view.setUint16(offset + 14, dosDate, true);
      view.setUint32(offset + 16, rec.crc, true);
      view.setUint32(offset + 20, size, true);
      view.setUint32(offset + 24, size, true);
      view.setUint16(offset + 28, nameLen, true);
      view.setUint16(offset + 30, 0, true);
      view.setUint16(offset + 32, 0, true);
      view.setUint16(offset + 34, 0, true);
      view.setUint16(offset + 36, 0, true);
      view.setUint32(offset + 38, 0, true);
      view.setUint32(offset + 42, rec.localHeaderOffset, true);
      out.set(rec.nameBytes, offset + 46);

      offset += 46 + nameLen;
    }

    // End of central directory record (PK\x05\x06)
    view.setUint32(offset, 0x06054b50, true);
    view.setUint16(offset + 4, 0, true);
    view.setUint16(offset + 6, 0, true);
    view.setUint16(offset + 8, records.length, true);
    view.setUint16(offset + 10, records.length, true);
    view.setUint32(offset + 12, centralDirSize, true);
    view.setUint32(offset + 16, centralDirStart, true);
    view.setUint16(offset + 20, 0, true);

    const outputType = options?.type ?? 'blob';
    if (outputType === 'uint8array') return out;
    if (outputType === 'arraybuffer') return buffer;
    if (outputType === 'base64') return encodeBytesToBase64(out);
    return new Blob([buffer], { type: 'application/zip' });
  }
}

export default JSZip;
