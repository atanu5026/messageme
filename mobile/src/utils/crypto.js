import crypto from 'isomorphic-webcrypto';
import { Buffer } from 'buffer';

// Helper for encoding/decoding text since TextEncoder might not be perfectly supported everywhere in RN
const getMessageEncoding = (text) => {
  return Buffer.from(text, 'utf-8');
};

const bufferToBase64 = (buffer) => {
  return Buffer.from(buffer).toString('base64');
};

const base64ToBuffer = (base64) => {
  const b = Buffer.from(base64, 'base64');
  return new Uint8Array(b).buffer;
};

// Generate ECDH Key Pair
export const generateKeyPair = async () => {
  await crypto.ensureSecure();
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
  return keyPair;
};

// Export key to JWK (JSON Web Key) format for storage/transmission
export const exportKey = async (key) => {
  await crypto.ensureSecure();
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
};

// Import key from JWK format
export const importPublicKey = async (jwkString) => {
  if (!jwkString) return null;
  try {
    await crypto.ensureSecure();
    const jwk = JSON.parse(jwkString);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
  } catch (error) {
    console.error('Failed to import public key', error);
    return null;
  }
};

export const importPrivateKey = async (jwkString) => {
  if (!jwkString) return null;
  try {
    await crypto.ensureSecure();
    const jwk = JSON.parse(jwkString);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
  } catch (error) {
    console.error('Failed to import private key', error);
    return null;
  }
};

// Derive shared secret (AES-GCM key) from own private key and other's public key
export const deriveSharedKey = async (privateKey, publicKey) => {
  if (!privateKey || !publicKey) return null;
  await crypto.ensureSecure();
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
};

// Encrypt string payload
export const encryptPayload = async (sharedKey, payloadStr) => {
  if (!sharedKey) return payloadStr;
  try {
    await crypto.ensureSecure();
    const encoded = getMessageEncoding(payloadStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      sharedKey,
      encoded
    );
    return JSON.stringify({
      iv: bufferToBase64(iv),
      data: bufferToBase64(ciphertext)
    });
  } catch (error) {
    console.error('Encryption failed:', error);
    return payloadStr;
  }
};

// Decrypt string payload
export const decryptPayload = async (sharedKey, encryptedStr) => {
  if (!sharedKey || !encryptedStr || typeof encryptedStr !== 'string') return encryptedStr;
  try {
    const trimmed = encryptedStr.trim();
    if (!trimmed.startsWith('{')) return encryptedStr;
    
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return encryptedStr;
    }
    
    if (!parsed || !parsed.iv || !parsed.data) return encryptedStr;

    await crypto.ensureSecure();
    const iv = base64ToBuffer(parsed.iv);
    const ciphertext = base64ToBuffer(parsed.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      sharedKey,
      ciphertext
    );
    
    return Buffer.from(decrypted).toString('utf-8');
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedStr;
  }
};
