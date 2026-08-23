// Utility functions for End-to-End Encryption (E2EE) using Web Crypto API

// Generate ECDH Key Pair
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
  return keyPair;
};

// Export key to JWK (JSON Web Key) format for storage/transmission
export const exportKey = async (key) => {
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
};

// Import key from JWK format
export const importPublicKey = async (jwkString) => {
  if (!jwkString) return null;
  try {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
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
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
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
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can cache it if needed
    ['encrypt', 'decrypt']
  );
};

// Convert string to ArrayBuffer
const getMessageEncoding = (text) => {
  let enc = new TextEncoder();
  return enc.encode(text);
};

// ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// Encrypt string payload
export const encryptPayload = async (sharedKey, payloadStr) => {
  if (!sharedKey) return payloadStr; // Fallback to unencrypted if no key
  try {
    const encoded = getMessageEncoding(payloadStr);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      sharedKey,
      encoded
    );
    // Return iv and ciphertext combined in a JSON string
    return JSON.stringify({
      iv: bufferToBase64(iv),
      data: bufferToBase64(ciphertext)
    });
  } catch (error) {
    console.error('Encryption failed:', error);
    return payloadStr; // Fallback
  }
};

// Decrypt string payload
export const decryptPayload = async (sharedKey, encryptedStr) => {
  if (!sharedKey || !encryptedStr || typeof encryptedStr !== 'string') return encryptedStr;
  try {
    const trimmed = encryptedStr.trim();
    // If it's not a JSON string with iv/data, it might be an unencrypted legacy message
    if (!trimmed.startsWith('{')) return encryptedStr;
    
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return encryptedStr;
    }
    
    if (!parsed || !parsed.iv || !parsed.data) return encryptedStr;

    const iv = base64ToBuffer(parsed.iv);
    const ciphertext = base64ToBuffer(parsed.data);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      sharedKey,
      ciphertext
    );
    
    let dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails due to key mismatch or corruption, don't return the ugly JSON string
    return '🔒 [Message could not be decrypted]';
  }
};
