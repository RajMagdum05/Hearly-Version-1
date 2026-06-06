import { describe, it, expect, beforeEach } from 'vitest';

// Pre-create the mock structures before importing cryptoStorage
const mockStorage: Record<string, any> = {};
const chromeMock = {
  storage: {
    local: {
      get: (keys: string | string[] | Record<string, any>, callback: (result: Record<string, any>) => void) => {
        const result: Record<string, any> = {};
        if (typeof keys === 'string') {
          result[keys] = mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => result[k] = mockStorage[k]);
        }
        setTimeout(() => callback(result), 0);
      },
      set: (items: Record<string, any>, callback?: () => void) => {
        Object.assign(mockStorage, items);
        if (callback) setTimeout(callback, 0);
      },
      remove: (keys: string | string[], callback?: () => void) => {
        if (typeof keys === 'string') {
          delete mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => delete mockStorage[k]);
        }
        if (callback) setTimeout(callback, 0);
      }
    }
  }
};

globalThis.chrome = chromeMock as any;

// IndexedDB Mock setup
const keysStore = new Map<string, any>();
const mockIndexedDB = {
  open: (_name: string, _version: number) => {
    const openReq: any = {
      result: {
        objectStoreNames: {
          contains: (storeName: string) => storeName === 'keys',
        },
        createObjectStore: (_storeName: string) => {},
        transaction: (_storeNames: string | string[], _mode: string) => {
          const tx: any = {
            objectStore: (_storeName: string) => {
              return {
                get: (key: string) => {
                  const getReq: any = {};
                  setTimeout(() => {
                    getReq.result = keysStore.get(key);
                    if (getReq.onsuccess) getReq.onsuccess();
                  }, 0);
                  return getReq;
                },
                put: (val: any, key: string) => {
                  keysStore.set(key, val);
                  const putReq: any = {};
                  setTimeout(() => {
                    putReq.result = key;
                    if (putReq.onsuccess) putReq.onsuccess();
                  }, 0);
                  return putReq;
                }
              };
            },
            oncomplete: null,
            onerror: null
          };
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete();
          }, 2);
          return tx;
        },
        close: () => {}
      },
      onsuccess: null,
      onupgradeneeded: null,
      onerror: null
    };

    setTimeout(() => {
      if (openReq.onupgradeneeded) openReq.onupgradeneeded();
      if (openReq.onsuccess) openReq.onsuccess();
    }, 0);

    return openReq;
  }
};

globalThis.indexedDB = mockIndexedDB as any;

// Now import the module under test
import { EncryptedLocalStorage } from '../services/cryptoStorage';

describe('EncryptedLocalStorage', () => {
  beforeEach(() => {
    // Clear storage and maps
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    keysStore.clear();
  });

  it('should encrypt and decrypt data correctly', async () => {
    const originalData = { userId: '12345', name: 'Alice', transcriptionEnabled: true };
    await EncryptedLocalStorage.encryptAndSet('user_profile', originalData);
    
    // Check that it is stored as encrypted colon-separated format (iv:ciphertext)
    expect(mockStorage['user_profile']).toBeDefined();
    expect(typeof mockStorage['user_profile']).toBe('string');
    expect(mockStorage['user_profile']).toContain(':');

    // Decrypt and verify
    const decrypted = await EncryptedLocalStorage.decryptAndGet<typeof originalData>('user_profile');
    expect(decrypted).toEqual(originalData);
  });

  it('should fall back to parsing plaintext JSON for backward compatibility', async () => {
    const plainData = { oldFormat: true, note: 'non-encrypted' };
    mockStorage['legacy_data'] = JSON.stringify(plainData);

    const result = await EncryptedLocalStorage.decryptAndGet<typeof plainData>('legacy_data');
    expect(result).toEqual(plainData);
  });

  it('should support in-memory key fallback if IndexedDB is not available', async () => {
    const backupIndexedDB = globalThis.indexedDB;
    // @ts-ignore
    delete globalThis.indexedDB;

    try {
      const data = { temp: 'in-memory-only' };
      await EncryptedLocalStorage.encryptAndSet('temp_data', data);
      
      const decrypted = await EncryptedLocalStorage.decryptAndGet<typeof data>('temp_data');
      expect(decrypted).toEqual(data);
    } finally {
      globalThis.indexedDB = backupIndexedDB;
    }
  });

  it('should migrate old JWK key from Chrome local storage to IndexedDB and then delete the old key', async () => {
    // 1. Generate an old JWK key and store it in mock chrome storage
    const testKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const jwk = await crypto.subtle.exportKey('jwk', testKey);
    mockStorage['hearly_storage_key_jwk'] = jwk;

    // Verify key exists in local storage
    expect(mockStorage['hearly_storage_key_jwk']).toBeDefined();
    expect(keysStore.get('storage_key')).toBeUndefined();

    // 2. Perform encryption (this should trigger migration)
    const testData = { secret: 'migration-test' };
    await EncryptedLocalStorage.encryptAndSet('data_key', testData);

    // 3. Verify key is removed from local storage and written to IndexedDB
    expect(mockStorage['hearly_storage_key_jwk']).toBeUndefined();
    
    const migratedKey = keysStore.get('storage_key') as CryptoKey;
    expect(migratedKey).toBeDefined();
    expect(migratedKey.extractable).toBe(false); // Should be non-extractable after import

    // 4. Verify decryption still works using the migrated key
    const decrypted = await EncryptedLocalStorage.decryptAndGet<typeof testData>('data_key');
    expect(decrypted).toEqual(testData);
  });
});
