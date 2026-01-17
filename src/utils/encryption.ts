/**
 * Encryption utilities for sensitive configuration files
 *
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits for AES-256
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;
const SCRYPT_OPTIONS = {
  N: 32768, // CPU/memory cost parameter
  r: 8, // Block size parameter
  p: 1, // Parallelization parameter
  maxmem: 128 * 1024 * 1024, // 128MB max memory
} as const;

export interface EncryptedData {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  data: string;
}

/**
 * Derive a 256-bit key from a password using scrypt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
}

/**
 * Encrypt plaintext data with a password
 * @param plaintext - The data to encrypt (YAML string)
 * @param password - The password to use for encryption
 * @returns Encrypted data object with version, salt, iv, auth tag, and encrypted data
 */
export function encrypt(plaintext: string, password: string): EncryptedData {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted,
  };
}

/**
 * Decrypt encrypted data with a password
 * @param encryptedData - The encrypted data object
 * @param password - The password used for encryption
 * @returns The decrypted plaintext (YAML string)
 * @throws Error if password is wrong or data is corrupted
 */
export function decrypt(encryptedData: EncryptedData, password: string): string {
  const salt = Buffer.from(encryptedData.salt, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');

  try {
    decrypted += decipher.final('utf8');
  } catch {
    throw new Error('Wrong password or corrupted data');
  }

  return decrypted;
}

/**
 * Parse encrypted data from a file content
 * @param content - The file content (JSON string)
 * @returns Parsed EncryptedData object
 * @throws Error if format is invalid
 */
export function parseEncryptedData(content: string): EncryptedData {
  const data = JSON.parse(content);

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid encrypted data format');
  }

  // Validate required fields
  const encrypted = data as EncryptedData;
  if (encrypted.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }

  if (!encrypted.salt || !encrypted.iv || !encrypted.authTag || !encrypted.data) {
    throw new Error('Missing required encryption fields');
  }

  return encrypted;
}

/**
 * Stringify encrypted data for file storage
 * @param encryptedData - The encrypted data object
 * @returns JSON string
 */
export function stringifyEncryptedData(encryptedData: EncryptedData): string {
  return JSON.stringify(encryptedData, null, 2);
}

/**
 * Check if data appears to be encrypted (JSON with encryption fields)
 * @param content - The file content
 * @returns True if content appears to be encrypted
 */
export function isEncrypted(content: string): boolean {
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const data = JSON.parse(trimmed);
      return (
        data &&
        typeof data === 'object' &&
        data.version &&
        data.salt &&
        data.iv &&
        data.authTag &&
        data.data
      );
    }
    return false;
  } catch {
    return false;
  }
}
