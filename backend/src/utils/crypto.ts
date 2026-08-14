import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

const configuredEncryptionKey = process.env.ENCRYPTION_KEY?.trim();
if (!configuredEncryptionKey || configuredEncryptionKey.length < 32) {
  throw new Error('ENCRYPTION_KEY environment variable must contain at least 32 characters');
}
const ENCRYPTION_KEY: string = configuredEncryptionKey;

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data (object or string)
 */
export function encrypt(data: any): string {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data);

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
  } catch {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data
 */
export function decrypt(encryptedData: string): any {
  try {
    // Decode from base64
    const buffer = Buffer.from(encryptedData, 'base64');
    if (buffer.length <= SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
      throw new Error('Encrypted payload is malformed');
    }

    // Extract components
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Try to parse as JSON, return string if fails
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash API key (one-way)
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}
