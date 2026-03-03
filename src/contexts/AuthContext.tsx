// src/contexts/AuthContext.tsx

import {
  createContext,
  JSX,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  type User,
  type UserCredential,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

import { auth, db } from '../firebase';


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type UserRole = 'Admin' | 'Member';

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  createdAt?: Timestamp;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  registerMember: (
    email: string,
    password: string,
    name: string,
    role?: UserRole
  ) => Promise<UserCredential>;
}


// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // ── Login ──────────────────────────────────
  async function login(
    email: string,
    password: string
  ): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // ── Logout ─────────────────────────────────
  async function logout(): Promise<void> {
    await signOut(auth);
    setUserProfile(null);
  }

  // ── Register Team Member (Admin Only) ─────
  async function registerMember(
    email: string,
    password: string,
    name: string,
    role: UserRole = 'Member'
  ): Promise<UserCredential> {

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const profile: Omit<UserProfile, 'createdAt'> = {
      name,
      email,
      role,
    };

    await setDoc(doc(db, 'teamMembers', result.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });

    return result;
  }

  // ── Auth State Listener ────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const snap = await getDoc(doc(db, 'teamMembers', user.uid));

        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAdmin = userProfile?.role === 'Admin';

  const value: AuthContextType = {
    currentUser,
    userProfile,
    isAdmin,
    authLoading,
    login,
    logout,
    registerMember,
  };

  return (
    <AuthContext.Provider value={value}>
      {!authLoading && children}
    </AuthContext.Provider>
  );
}


// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}