import crypto from 'crypto';

/**
 * Generate a secure random API key
 * Format: mypos_live_[64 random hex characters]
 */
export const generateApiKey = (): string => {
  const randomBytes = crypto.randomBytes(32);
  const keyHash = randomBytes.toString('hex');
  return `mypos_live_${keyHash}`;
};

/**
 * Hash an API key for storage
 * We store hashed keys in the database for security
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

/**
 * Verify an API key against a hash
 */
export const verifyApiKey = (apiKey: string, hash: string): boolean => {
  const computedHash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
};
