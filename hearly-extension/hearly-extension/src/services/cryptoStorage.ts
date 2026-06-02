// cryptoStorage.ts
// Secure AES-GCM local storage encryption using Web Crypto API.

const KEY_ALIAS = 'hearly_storage_key_jwk';

async function getOrCreateKey(): Promise<CryptoKey> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(KEY_ALIAS, async (res) => {
      if (res[KEY_ALIAS]) {
        try {
          const jwk = res[KEY_ALIAS];
          const key = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          resolve(key);
          return;
        } catch (e) {
          console.error('[Hearly Crypto] Key import failed, generating new key', e);
        }
      }

      // Generate new key
      try {
        const key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        const jwk = await crypto.subtle.exportKey('jwk', key);
        chrome.storage.local.set({ [KEY_ALIAS]: jwk }, () => {
          resolve(key);
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class EncryptedLocalStorage {
  public static async encryptAndSet(key: string, data: any): Promise<void> {
    try {
      const cryptoKey = await getOrCreateKey();
      const textEncoder = new TextEncoder();
      const rawData = textEncoder.encode(JSON.stringify(data));
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        rawData
      );

      const payload = `${bufferToBase64(iv.buffer)}:${bufferToBase64(encrypted)}`;
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: payload }, resolve);
      });
    } catch (err) {
      console.error('[Hearly Crypto] Encryption failed for key:', key, err);
      // Fallback: save unencrypted on critical failure to avoid breaking app functionality
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: JSON.stringify(data) }, resolve);
      });
    }
  }

  public static async decryptAndGet<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, async (result) => {
        const payload = result[key];
        if (!payload || typeof payload !== 'string') {
          resolve(null);
          return;
        }

        if (!payload.includes(':')) {
          // Plaintext fallback (for backward compatibility / unencrypted saves)
          try {
            resolve(JSON.parse(payload) as T);
          } catch {
            resolve(null);
          }
          return;
        }

        try {
          const cryptoKey = await getOrCreateKey();
          const [ivB64, ciphertextB64] = payload.split(':');
          if (!ivB64 || !ciphertextB64) {
            resolve(null);
            return;
          }

          const iv = new Uint8Array(base64ToBuffer(ivB64));
          const ciphertext = base64ToBuffer(ciphertextB64);

          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            ciphertext
          );

          const textDecoder = new TextDecoder();
          resolve(JSON.parse(textDecoder.decode(decrypted)) as T);
        } catch (e) {
          console.error('[Hearly Crypto] Decryption failed for key:', key, e);
          resolve(null);
        }
      });
    });
  }
}
