const startsWith = (buffer: Buffer, signature: number[], offset = 0): boolean =>
  signature.every((byte, index) => buffer[offset + index] === byte);

const isUtf8Text = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
};

/**
 * Confirm that the bytes agree with the declared upload type. This is not a
 * malware scanner; it prevents a client-controlled multipart MIME value from
 * turning arbitrary bytes into a trusted document type.
 */
export const matchesDeclaredFileType = (buffer: Buffer, mimeTypeValue: unknown): boolean => {
  const mimeType = String(mimeTypeValue || '').toLowerCase();
  if (!buffer.length) return false;

  switch (mimeType) {
    case 'application/pdf':
      return startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    case 'image/jpeg':
    case 'image/jpg':
      return startsWith(buffer, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif':
      return startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    case 'image/webp':
      return startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8);
    case 'application/vnd.ms-excel':
    case 'application/msword':
      return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
        startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
        startsWith(buffer, [0x50, 0x4b, 0x07, 0x08]);
    case 'text/plain':
    case 'text/markdown':
    case 'text/csv':
      return isUtf8Text(buffer);
    default:
      return false;
  }
};
