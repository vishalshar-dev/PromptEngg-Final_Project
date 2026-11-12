import { useEffect, useRef } from 'react';
import { useAppStore, Transaction } from '../store/useStore';

const DB_NAME = 'CartAuditDB';
const STORE_NAME = 'transactions';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveTransactions = async (txs: Transaction[]) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  txs.forEach((t) => store.put(t));
};

const getTransactions = async (): Promise<Transaction[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export function useSyncStore() {
  const transactions = useAppStore((state) => state.transactions);
  const setTransactions = useAppStore((state) => state.setTransactions);
  const isLoaded = useRef(false);

  useEffect(() => {
    getTransactions().then((data) => {
      if (data && data.length > 0) {
        setTransactions(data);
      }
      isLoaded.current = true;
    });
  }, [setTransactions]);

  useEffect(() => {
    if (isLoaded.current) {
      saveTransactions(transactions);
    }
  }, [transactions]);
}