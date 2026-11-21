import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_MART_ITEMS } from '../data/martCatalog';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { useAppStore } from '../store/useStore';
import {
  applyCloudSectionsToBackup,
  backupToSyncableState,
  buildSectionPayloads,
  computeSectionHashes,
  detectDeviceLabel,
  hasMeaningfulWorkspaceData,
  smartMergeLocalAndCloud,
  SYNC_SECTION_IDS,
  type PartialCloudSections,
  type SyncableWorkspaceState,
  type SyncSectionId,
} from '../utils/cloudSyncEngine';

export type CloudSyncStatus =
  | 'signed_out'
  | 'connecting'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'offline'
  | 'error';

export interface SyncConflictInfo {
  cloudSections: PartialCloudSections;
  cloudDeviceName: string;
  cloudUpdatedAt: string | null;
  cloudTransactionCount: number;
  cloudSplitsCount: number;
  cloudPennyCount: number;
  localTransactionCount: number;
  localSplitsCount: number;
  localPennyCount: number;
}

interface CloudSyncContextValue {
  user: User | null;
  authReady: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  quotaUpgradeUrl: string | null;
  deviceLabel: string;
  isSigningIn: boolean;
  pendingConflict: SyncConflictInfo | null;
  signInWithGoogle: () => Promise<void>;
  signOutAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
  resolveConflict: (choice: 'merge' | 'cloud' | 'local') => Promise<void>;
  clearSyncError: () => void;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

function extractSyncableState(): SyncableWorkspaceState {
  const s = useAppStore.getState();
  return {
    items: s.items,
    transactions: s.transactions,
    totalBudget: s.totalBudget,
    sessionBudget: s.sessionBudget,
    isBrokeMode: s.isBrokeMode,
    brokeModeConfig: s.brokeModeConfig,
    categoryLimits: s.categoryLimits,
    warRoomChallenges: s.warRoomChallenges,
    warRoomTargets: s.warRoomTargets,
    dismissedWarRoomAlerts: s.dismissedWarRoomAlerts,
    disciplineCheckIns: s.disciplineCheckIns,
    categories: s.categories,
    categoryConfigs: s.categoryConfigs,
    categoryCaps: s.categoryCaps,
    priceHistory: s.priceHistory,
    purchaseHistory: s.purchaseHistory,
    basketTemplates: s.basketTemplates,
    basketTemplatesSeeded: s.basketTemplatesSeeded,
    priceObservations: s.priceObservations,
    priceAlerts: s.priceAlerts,
    savedAudits: s.savedAudits,
    people: s.people,
    sharedExpenses: s.sharedExpenses,
    settlements: s.settlements,
    theme: s.theme,
    featureSettings: s.featureSettings,
    pennyMessages: s.pennyMessages,
    pennyProfile: s.pennyProfile,
    myUpiId: s.myUpiId,
    myUpiName: s.myUpiName,
  };
}

function getQuotaUpgradeLink(errMsg: string): string | null {
  if (errMsg.includes('Free daily read units per project')) {
    return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
  }
  return null;
}

function formatReadableSyncError(err: unknown): { message: string; quotaUrl: string | null } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('Quota exceeded')) {
    return {
      message: 'Daily Firestore free-tier quota exceeded. Local changes remain saved and sync resumes after quota reset.',
      quotaUrl: getQuotaUpgradeLink(raw),
    };
  }
  if (raw.includes('client is offline') || raw.includes('network-request-failed')) {
    return {
      message: 'You appear offline. Changes are saved locally and will sync once reconnected.',
      quotaUrl: null,
    };
  }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed.error) {
        return {
          message: parsed.error,
          quotaUrl: getQuotaUpgradeLink(parsed.error),
        };
      }
    } catch {
      // keep raw
    }
  }
  return { message: raw || 'Cloud sync encountered an unexpected error.', quotaUrl: null };
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('signed_out');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [quotaUpgradeUrl, setQuotaUpgradeUrl] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<SyncConflictInfo | null>(null);

  const deviceLabel = useMemo(() => detectDeviceLabel(), []);
  const tabSessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `tab-${crypto.randomUUID().slice(0, 12)}`
      : `tab-${Date.now().toString(36)}`
  );

  const lastHashesRef = useRef<Record<SyncSectionId, string> | null>(null);
  const knownCloudSectionsRef = useRef<Set<SyncSectionId>>(new Set());
  const isApplyingRemoteRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialSyncDoneRef = useRef(false);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
    setQuotaUpgradeUrl(null);
  }, []);

  const ensureUserProfileDocs = useCallback(
    async (signedUser: User) => {
      const uid = signedUser.uid;
      const userPath = `users/${uid}`;
      const privatePath = `users/${uid}/private/info`;
      const userRef = doc(db, 'users', uid);
      const privateRef = doc(db, 'users', uid, 'private', 'info');

      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }

      const displayName = (signedUser.displayName || 'CartAudit User').slice(0, 120);
      const photoURL = (signedUser.photoURL || '').slice(0, 500);
      const email = (signedUser.email || '').slice(0, 254);

      if (!userSnap.exists()) {
        const batch = writeBatch(db);
        batch.set(userRef, {
          ownerId: uid,
          displayName,
          photoURL,
          lastDeviceLabel: deviceLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (email) {
          batch.set(privateRef, {
            ownerId: uid,
            email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, userPath);
        }
        return;
      }

      try {
        await updateDoc(userRef, {
          displayName,
          photoURL,
          lastDeviceLabel: deviceLabel,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      }

      if (email) {
        let privSnap;
        try {
          privSnap = await getDoc(privateRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, privatePath);
        }
        try {
          if (!privSnap.exists()) {
            await setDoc(privateRef, {
              ownerId: uid,
              email,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else if (privSnap.data().email !== email) {
            await updateDoc(privateRef, {
              email,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, privatePath);
        }
      }
    },
    [deviceLabel]
  );

  const writeSectionsToCloud = useCallback(
    async (
      uid: string,
      sectionIds: SyncSectionId[],
      payloads = buildSectionPayloads(extractSyncableState(), INITIAL_MART_ITEMS)
    ) => {
      if (sectionIds.length === 0) return;
      setSyncStatus('syncing');

      const clientNow = new Date().toISOString();
      const hashes = computeSectionHashes(payloads);

      for (const secId of sectionIds) {
        const docPath = `users/${uid}/workspace/${secId}`;
        const secRef = doc(db, 'users', uid, 'workspace', secId);
        const alreadyExists = knownCloudSectionsRef.current.has(secId);

        try {
          if (alreadyExists) {
            await updateDoc(secRef, {
              clientUpdatedAt: clientNow,
              deviceName: deviceLabel,
              writerSessionId: tabSessionIdRef.current,
              payload: payloads[secId],
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(secRef, {
              ownerId: uid,
              section: secId,
              clientUpdatedAt: clientNow,
              deviceName: deviceLabel,
              writerSessionId: tabSessionIdRef.current,
              payload: payloads[secId],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            knownCloudSectionsRef.current.add(secId);
          }
        } catch (err) {
          handleFirestoreError(
            err,
            alreadyExists ? OperationType.UPDATE : OperationType.CREATE,
            docPath
          );
        }
      }

      lastHashesRef.current = hashes;
      setLastSyncedAt(clientNow);
      setSyncStatus('synced');
      setSyncError(null);
      setQuotaUpgradeUrl(null);
    },
    [deviceLabel]
  );

  const applyBackupLocally = useCallback(
    (
      backupData: ReturnType<typeof applyCloudSectionsToBackup>,
      updatedSections?: SyncSectionId[]
    ) => {
      isApplyingRemoteRef.current = true;
      try {
        useAppStore.getState().importBackupData(backupData);
        const updatedPayloads = buildSectionPayloads(
          extractSyncableState(),
          INITIAL_MART_ITEMS
        );
        const nextHashes = computeSectionHashes(updatedPayloads);
        if (updatedSections && lastHashesRef.current) {
          const mergedHashes = { ...lastHashesRef.current };
          for (const secId of updatedSections) {
            mergedHashes[secId] = nextHashes[secId];
          }
          lastHashesRef.current = mergedHashes;
        } else {
          lastHashesRef.current = nextHashes;
        }
      } finally {
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 80);
      }
    },
    []
  );

  const resolveConflict = useCallback(
    async (choice: 'merge' | 'cloud' | 'local') => {
      if (!user || !pendingConflict) return;
      setSyncStatus('syncing');
      try {
        const localState = extractSyncableState();
        if (choice === 'cloud') {
          const backup = applyCloudSectionsToBackup(
            pendingConflict.cloudSections,
            localState,
            INITIAL_MART_ITEMS
          );
          applyBackupLocally(backup);
          setLastSyncedAt(new Date().toISOString());
          setSyncStatus('synced');
        } else if (choice === 'merge') {
          const mergedBackup = smartMergeLocalAndCloud(
            localState,
            pendingConflict.cloudSections,
            INITIAL_MART_ITEMS
          );
          applyBackupLocally(mergedBackup);
          await writeSectionsToCloud(user.uid, [...SYNC_SECTION_IDS]);
        } else {
          await writeSectionsToCloud(user.uid, [...SYNC_SECTION_IDS]);
        }
        setPendingConflict(null);
        isInitialSyncDoneRef.current = true;
      } catch (err) {
        const parsed = formatReadableSyncError(err);
        setSyncError(parsed.message);
        setQuotaUpgradeUrl(parsed.quotaUrl);
        setSyncStatus('error');
      }
    },
    [applyBackupLocally, pendingConflict, user, writeSectionsToCloud]
  );

  const syncNow = useCallback(async () => {
    if (!user || pendingConflict) return;
    try {
      const payloads = buildSectionPayloads(extractSyncableState(), INITIAL_MART_ITEMS);
      await writeSectionsToCloud(user.uid, [...SYNC_SECTION_IDS], payloads);
    } catch (err) {
      const parsed = formatReadableSyncError(err);
      setSyncError(parsed.message);
      setQuotaUpgradeUrl(parsed.quotaUrl);
      setSyncStatus(
        parsed.message.toLowerCase().includes('offline') ? 'offline' : 'error'
      );
    }
  }, [pendingConflict, user, writeSectionsToCloud]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    setSyncError(null);
    setQuotaUpgradeUrl(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User intentionally dismissed popup — do not alarm
      } else {
        const parsed = formatReadableSyncError(err);
        setSyncError(parsed.message);
        setSyncStatus('error');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutAccount = useCallback(async () => {
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    isInitialSyncDoneRef.current = false;
    knownCloudSectionsRef.current = new Set();
    lastHashesRef.current = null;
    setPendingConflict(null);
    setSyncError(null);
    setQuotaUpgradeUrl(null);
    await signOut(auth);
    setSyncStatus('signed_out');
  }, []);

  // Auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        isInitialSyncDoneRef.current = false;
        knownCloudSectionsRef.current = new Set();
        lastHashesRef.current = null;
        setPendingConflict(null);
        setSyncStatus('signed_out');
      }
    });
    return () => unsubscribe();
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const onOffline = () => {
      if (user) setSyncStatus('offline');
    };
    const onOnline = () => {
      if (user && isInitialSyncDoneRef.current && !pendingConflict) {
        void syncNow();
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [pendingConflict, syncNow, user]);

  // Initial sync + real-time Firestore listener when authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    if (!user.emailVerified) {
      setSyncError('Please sign in with a verified Google account to enable Cloud Sync.');
      setSyncStatus('error');
      return;
    }

    let cancelled = false;
    let unsubscribeSnapshot: (() => void) | null = null;
    const uid = user.uid;
    const workspaceColPath = `users/${uid}/workspace`;

    const initAndSubscribe = async () => {
      setSyncStatus('connecting');
      setSyncError(null);
      setQuotaUpgradeUrl(null);
      isInitialSyncDoneRef.current = false;
      knownCloudSectionsRef.current = new Set();

      try {
        await ensureUserProfileDocs(user);
        if (cancelled) return;

        const wsQuery = query(
          collection(db, 'users', uid, 'workspace'),
          where('ownerId', '==', uid)
        );

        let initialSnap;
        try {
          initialSnap = await getDocs(wsQuery);
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, workspaceColPath);
        }
        if (cancelled) return;

        const cloudSections: PartialCloudSections = {};
        let latestCloudUpdatedAt: string | null = null;
        let latestCloudDevice = 'Another device';

        initialSnap.forEach((docSnap) => {
          const id = docSnap.id as SyncSectionId;
          if (SYNC_SECTION_IDS.includes(id)) {
            knownCloudSectionsRef.current.add(id);
            const data = docSnap.data() as {
              payload?: unknown;
              clientUpdatedAt?: string;
              deviceName?: string;
            };
            if (data.payload && typeof data.payload === 'object') {
              (cloudSections as Record<string, unknown>)[id] = data.payload;
            }
            if (
              typeof data.clientUpdatedAt === 'string' &&
              (!latestCloudUpdatedAt || data.clientUpdatedAt > latestCloudUpdatedAt)
            ) {
              latestCloudUpdatedAt = data.clientUpdatedAt;
              if (typeof data.deviceName === 'string' && data.deviceName.trim()) {
                latestCloudDevice = data.deviceName.trim();
              }
            }
          }
        });

        const localState = extractSyncableState();
        const localPayloads = buildSectionPayloads(localState, INITIAL_MART_ITEMS);
        const localHashes = computeSectionHashes(localPayloads);
        const cloudExists = knownCloudSectionsRef.current.size > 0;
        const localHasData = hasMeaningfulWorkspaceData(localState);

        if (!cloudExists) {
          await writeSectionsToCloud(uid, [...SYNC_SECTION_IDS], localPayloads);
          isInitialSyncDoneRef.current = true;
        } else if (!localHasData) {
          const backup = applyCloudSectionsToBackup(
            cloudSections,
            localState,
            INITIAL_MART_ITEMS
          );
          applyBackupLocally(backup);
          setLastSyncedAt(latestCloudUpdatedAt || new Date().toISOString());
          setSyncStatus('synced');
          isInitialSyncDoneRef.current = true;
        } else {
          const cloudAsBackup = applyCloudSectionsToBackup(
            cloudSections,
            localState,
            INITIAL_MART_ITEMS
          );
          const cloudHashes = computeSectionHashes(
            buildSectionPayloads(
              backupToSyncableState(cloudAsBackup, localState),
              INITIAL_MART_ITEMS
            )
          );

          const hasRealDifference = SYNC_SECTION_IDS.some(
            (id) =>
              knownCloudSectionsRef.current.has(id) && localHashes[id] !== cloudHashes[id]
          );

          if (!hasRealDifference) {
            lastHashesRef.current = localHashes;
            setLastSyncedAt(latestCloudUpdatedAt || new Date().toISOString());
            setSyncStatus('synced');
            isInitialSyncDoneRef.current = true;
          } else {
            setPendingConflict({
              cloudSections,
              cloudDeviceName: latestCloudDevice,
              cloudUpdatedAt: latestCloudUpdatedAt,
              cloudTransactionCount: cloudAsBackup.transactions.length,
              cloudSplitsCount: (cloudAsBackup.sharedExpenses ?? []).length,
              cloudPennyCount: (cloudAsBackup.pennyMessages ?? []).length,
              localTransactionCount: localState.transactions.length,
              localSplitsCount: localState.sharedExpenses.length,
              localPennyCount: localState.pennyMessages.length,
            });
            setSyncStatus('conflict');
          }
        }

        if (cancelled) return;

        // Attach real-time cross-device listener
        unsubscribeSnapshot = onSnapshot(
          wsQuery,
          (snapshot) => {
            if (cancelled || !isInitialSyncDoneRef.current) return;
            if (snapshot.metadata.hasPendingWrites) return;

            const remoteUpdates: PartialCloudSections = {};
            let remoteChanged = false;
            let remoteTime: string | null = null;

            snapshot.docChanges().forEach((change) => {
              const id = change.doc.id as SyncSectionId;
              if (!SYNC_SECTION_IDS.includes(id)) return;
              if (change.type === 'added' || change.type === 'modified') {
                knownCloudSectionsRef.current.add(id);
                const data = change.doc.data() as {
                  writerSessionId?: string;
                  clientUpdatedAt?: string;
                  payload?: unknown;
                };
                if (data.writerSessionId === tabSessionIdRef.current) {
                  return;
                }
                if (data.payload && typeof data.payload === 'object') {
                  (remoteUpdates as Record<string, unknown>)[id] = data.payload;
                  remoteChanged = true;
                  if (typeof data.clientUpdatedAt === 'string') {
                    remoteTime = data.clientUpdatedAt;
                  }
                }
              }
            });

            if (!remoteChanged) return;

            const remoteSectionIds = Object.keys(remoteUpdates) as SyncSectionId[];
            const currentLocal = extractSyncableState();
            const mergedBackup = applyCloudSectionsToBackup(
              remoteUpdates,
              currentLocal,
              INITIAL_MART_ITEMS
            );
            applyBackupLocally(mergedBackup, remoteSectionIds);
            setLastSyncedAt(remoteTime || new Date().toISOString());
            setSyncStatus('synced');
          },
          (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, workspaceColPath);
            } catch (wrappedErr) {
              const parsed = formatReadableSyncError(wrappedErr);
              setSyncError(parsed.message);
              setQuotaUpgradeUrl(parsed.quotaUrl);
              setSyncStatus('error');
            }
          }
        );
      } catch (err) {
        if (cancelled) return;
        const parsed = formatReadableSyncError(err);
        setSyncError(parsed.message);
        setQuotaUpgradeUrl(parsed.quotaUrl);
        setSyncStatus(
          parsed.message.toLowerCase().includes('offline') ? 'offline' : 'error'
        );
      }
    };

    void initAndSubscribe();

    return () => {
      cancelled = true;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [applyBackupLocally, authReady, ensureUserProfileDocs, user, writeSectionsToCloud]);

  // Debounced auto-push whenever local Zustand store slices change while signed in
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubscribeStore = useAppStore.subscribe(() => {
      if (!isInitialSyncDoneRef.current || isApplyingRemoteRef.current || pendingConflict) {
        return;
      }

      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }

      pushTimerRef.current = setTimeout(() => {
        if (!isInitialSyncDoneRef.current || isApplyingRemoteRef.current || pendingConflict) {
          return;
        }
        const currentPayloads = buildSectionPayloads(
          extractSyncableState(),
          INITIAL_MART_ITEMS
        );
        const nextHashes = computeSectionHashes(currentPayloads);
        const prevHashes = lastHashesRef.current;

        const dirtySections = prevHashes
          ? SYNC_SECTION_IDS.filter((id) => prevHashes[id] !== nextHashes[id])
          : [...SYNC_SECTION_IDS];

        if (dirtySections.length === 0) return;

        void writeSectionsToCloud(user.uid, dirtySections, currentPayloads).catch((err) => {
          const parsed = formatReadableSyncError(err);
          setSyncError(parsed.message);
          setQuotaUpgradeUrl(parsed.quotaUrl);
          setSyncStatus(
            parsed.message.toLowerCase().includes('offline') ? 'offline' : 'error'
          );
        });
      }, 900);
    });

    return () => {
      unsubscribeStore();
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, [authReady, pendingConflict, user, writeSectionsToCloud]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      user,
      authReady,
      syncStatus,
      lastSyncedAt,
      syncError,
      quotaUpgradeUrl,
      deviceLabel,
      isSigningIn,
      pendingConflict,
      signInWithGoogle,
      signOutAccount,
      syncNow,
      resolveConflict,
      clearSyncError,
    }),
    [
      authReady,
      clearSyncError,
      deviceLabel,
      isSigningIn,
      lastSyncedAt,
      pendingConflict,
      quotaUpgradeUrl,
      resolveConflict,
      signInWithGoogle,
      signOutAccount,
      syncError,
      syncNow,
      syncStatus,
      user,
    ]
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) {
    throw new Error('useCloudSync must be used inside CloudSyncProvider.');
  }
  return ctx;
}
