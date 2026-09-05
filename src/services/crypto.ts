/**
 * Encrypted Messaging Protocol for Safe Word Emergency Alerts
 * Uses Web Crypto API (AES-GCM 256-bit with SHA-256 payload integrity signature)
 */

export interface EncryptedPackage {
  ciphertext: string; // Base64 ciphertext
  iv: string; // Base64 Initialization Vector (12 bytes)
  salt: string; // Base64 PBKDF2 salt
  hash: string; // SHA-256 integrity digest hex
  algorithm: string;
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Calculate SHA-256 hex digest
export async function calculateSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES-GCM Key using PBKDF2 from shared secret
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt an emergency payload with AES-256-GCM
 */
export async function encryptEmergencyPayload(
  payloadObj: Record<string, unknown>,
  secretKeyString: string = 'SAFEWORD_NIGERIA_E2EE_PROTOCOL_2026'
): Promise<EncryptedPackage> {
  const jsonStr = JSON.stringify(payloadObj);
  const hash = await calculateSha256(jsonStr);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secretKeyString, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(jsonStr);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    hash,
    algorithm: 'AES-256-GCM-PBKDF2',
  };
}

/**
 * Decrypt an emergency payload with AES-256-GCM
 */
export async function decryptEmergencyPayload(
  pkg: EncryptedPackage,
  secretKeyString: string = 'SAFEWORD_NIGERIA_E2EE_PROTOCOL_2026'
): Promise<Record<string, unknown> | null> {
  try {
    const salt = base64ToUint8Array(pkg.salt);
    const iv = base64ToUint8Array(pkg.iv);
    const ciphertext = base64ToUint8Array(pkg.ciphertext);

    const key = await deriveKey(secretKeyString, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}
