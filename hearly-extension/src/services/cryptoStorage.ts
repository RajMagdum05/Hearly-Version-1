// cryptoStorage.ts
// Secure AES-GCM local storage encryption using Web Crypto API.

const KEY_ALIAS = 'hearly_storage_key_jwk';
let memoryKey: CryptoKey | null = null;

async function getOrCreateKey(): Promise<CryptoKey> {
  const hasChromeStorage = typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
  const hasIndexedDB = typeof indexedDB !== 'undefined';

  if (!hasIndexedDB) {
    if (memoryKey) return memoryKey;
    memoryKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    return memoryKey;
  }

  return new Promise((resolve, reject) => {
    const dbOpenRequest = indexedDB.open('hearly_crypto_db', 1);

    dbOpenRequest.onupgradeneeded = () => {
      const db = dbOpenRequest.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };

    dbOpenRequest.onsuccess = () => {
      const db = dbOpenRequest.result;
      const tx = db.transaction('keys', 'readwrite');
      const store = tx.objectStore('keys');
      const getReq = store.get('storage_key');

      getReq.onsuccess = async () => {
        if (getReq.result) {
          resolve(getReq.result);
          db.close();
          return;
        }

        // Key doesn't exist in IndexedDB. Check chrome.storage.local for migration.
        if (hasChromeStorage) {
          chrome.storage.local.get(KEY_ALIAS, async (res) => {
            if (res[KEY_ALIAS]) {
              try {
                const jwk = res[KEY_ALIAS];
                const key = await crypto.subtle.importKey(
                  'jwk',
                  jwk,
                  { name: 'AES-GCM', length: 256 },
                  false, // import as non-extractable!
                  ['encrypt', 'decrypt']
                );

                // Save to IndexedDB
                const txWrite = db.transaction('keys', 'readwrite');
                txWrite.objectStore('keys').put(key, 'storage_key');

                txWrite.oncomplete = () => {
                  chrome.storage.local.remove(KEY_ALIAS, () => {
                    console.log('[Hearly Crypto] Key successfully migrated to IndexedDB and removed from local storage.');
                    resolve(key);
                    db.close();
                  });
                };
                return;
              } catch (e) {
                console.error('[Hearly Crypto] Old key import/migration failed', e);
              }
            }

            // Generate a completely new non-extractable key
            try {
              const key = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                false, // extractable = false
                ['encrypt', 'decrypt']
              );

              const txWrite = db.transaction('keys', 'readwrite');
              txWrite.objectStore('keys').put(key, 'storage_key');
              txWrite.oncomplete = () => {
                resolve(key);
                db.close();
              };
            } catch (err) {
              reject(err);
              db.close();
            }
          });
        } else {
          // No Chrome storage, generate key directly in IndexedDB
          try {
            const key = await crypto.subtle.generateKey(
              { name: 'AES-GCM', length: 256 },
              false, // extractable = false
              ['encrypt', 'decrypt']
            );

            const txWrite = db.transaction('keys', 'readwrite');
            txWrite.objectStore('keys').put(key, 'storage_key');
            txWrite.oncomplete = () => {
              resolve(key);
              db.close();
            };
          } catch (err) {
            reject(err);
            db.close();
          }
        }
      };

      getReq.onerror = (e) => {
        reject(e);
        db.close();
      };
    };

    dbOpenRequest.onerror = (e) => {
      reject(dbOpenRequest.error || e);
    };
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

        const isJson = payload.trim().startsWith('{') || payload.trim().startsWith('[');
        if (isJson || !payload.includes(':')) {
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
