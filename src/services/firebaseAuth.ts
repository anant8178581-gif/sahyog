import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import { auth } from './firebaseFirestore';

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
}

class FirebaseAuthService {
  private auth: Auth = auth;
  private localUser: AuthUserProfile | null = null;
  private listeners: ((user: AuthUserProfile | null) => void)[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: AuthUserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName:
            firebaseUser.displayName ||
            (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Field Operative'),
          isAnonymous: firebaseUser.isAnonymous,
        };
        this.localUser = profile;
        this.saveLocalSession(profile);
        this.notify(profile);
      } else {
        // Automatically sign in anonymously if no authenticated session exists
        try {
          const cred = await signInAnonymously(this.auth);
          const profile: AuthUserProfile = {
            uid: cred.user.uid,
            email: null,
            displayName: 'Field Operative',
            isAnonymous: true,
          };
          this.localUser = profile;
          this.saveLocalSession(profile);
          this.notify(profile);
        } catch (err) {
          console.warn('Anonymous session establishment notice:', err);
          this.restoreLocalSession();
        }
      }
      this.isInitialized = true;
    });
  }

  /**
   * Ensure user is authenticated, signing in anonymously if not currently logged in
   */
  public async ensureAuthenticated(): Promise<AuthUserProfile> {
    if (this.auth.currentUser) {
      const u = this.auth.currentUser;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Field Operative'),
        isAnonymous: u.isAnonymous,
      };
    }
    return this.signInAnonymous();
  }

  private restoreLocalSession() {
    try {
      const stored = localStorage.getItem('sahyog_auth_user');
      if (stored) {
        this.localUser = JSON.parse(stored);
        this.notify(this.localUser);
        return;
      }
    } catch {
      // Ignored
    }

    const defaultAnon: AuthUserProfile = {
      uid: `anon_${Math.random().toString(36).substring(2, 9)}`,
      email: null,
      displayName: 'Field Operative',
      isAnonymous: true,
    };
    this.localUser = defaultAnon;
    this.saveLocalSession(defaultAnon);
    this.notify(defaultAnon);
  }

  private saveLocalSession(user: AuthUserProfile | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem('sahyog_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sahyog_auth_user');
    }
  }

  private notify(user: AuthUserProfile | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(user);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /**
   * Subscribe to auth state updates
   */
  public onAuthState(callback: (user: AuthUserProfile | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.localUser);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public getCurrentUser(): AuthUserProfile | null {
    return this.localUser;
  }

  public getFirebaseUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Sign In Anonymously (Field fast-track session)
   */
  public async signInAnonymous(): Promise<AuthUserProfile> {
    try {
      const credential = await signInAnonymously(this.auth);
      const profile: AuthUserProfile = {
        uid: credential.user.uid,
        email: null,
        displayName: 'Field Operative',
        isAnonymous: true,
      };
      this.localUser = profile;
      this.saveLocalSession(profile);
      this.notify(profile);
      return profile;
    } catch (err: any) {
      console.warn('Firebase anonymous sign in notice:', err);
      const fallback: AuthUserProfile = this.localUser || {
        uid: `anon_${Date.now()}`,
        email: null,
        displayName: 'Field Operative',
        isAnonymous: true,
      };
      return fallback;
    }
  }

  /**
   * Sign In with Email & Password
   */
  public async signInEmail(email: string, pass: string): Promise<AuthUserProfile> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, pass);
      const profile: AuthUserProfile = {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || email.split('@')[0],
        isAnonymous: false,
      };
      this.localUser = profile;
      this.saveLocalSession(profile);
      this.notify(profile);
      return profile;
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        throw new Error('Invalid credentials. Check your email and password.');
      }
      if (err.code === 'auth/user-not-found') {
        throw new Error('No user account found with this email. Please register first.');
      }
      throw new Error(err.message || 'Authentication failed');
    }
  }

  /**
   * Register with Email & Password
   */
  public async signUpEmail(email: string, pass: string, name: string): Promise<AuthUserProfile> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
      if (name && credential.user) {
        try {
          await updateProfile(credential.user, { displayName: name });
        } catch {
          // Non-blocking
        }
      }
      const profile: AuthUserProfile = {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name || email.split('@')[0],
        isAnonymous: false,
      };
      this.localUser = profile;
      this.saveLocalSession(profile);
      this.notify(profile);
      return profile;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account already exists with this email address.');
      }
      if (err.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      throw new Error(err.message || 'Registration failed');
    }
  }

  /**
   * Sign Out
   */
  public async logOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch {
      // Suppress
    }
    this.localUser = null;
    this.saveLocalSession(null);
    this.notify(null);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
