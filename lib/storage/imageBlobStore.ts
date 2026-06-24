/**
 * Almacén de imágenes en **IndexedDB** (sin dependencias) para el "Plano de
 * campo": la imagen rasterizada del GeoPDF puede pesar >1 MB, demasiado para
 * localStorage. La metadata liviana (esquinas, opacidad) va al store persistido;
 * el blob de la imagen va aquí, indexado por una clave.
 */

const DB_NAME = "agrocontrol-plano";
const STORE = "imagenes";
const VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function conStore<T>(
  modo: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, modo).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Guarda (o reemplaza) el blob de imagen bajo `key`. */
export function putImage(key: string, blob: Blob): Promise<IDBValidKey> {
  return conStore<IDBValidKey>("readwrite", (s) => s.put(blob, key));
}

/** Recupera el blob de imagen, o null si no existe. */
export async function getImage(key: string): Promise<Blob | null> {
  const blob = await conStore<Blob | undefined>("readonly", (s) => s.get(key));
  return blob ?? null;
}

/** Borra el blob de imagen. */
export function deleteImage(key: string): Promise<undefined> {
  return conStore<undefined>("readwrite", (s) => s.delete(key));
}
