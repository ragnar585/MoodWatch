import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from './firebaseConfig';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginGoogle = () => signInWithPopup(auth, googleProvider);

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (name, email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    setUser({ ...result.user, displayName: name });
    return result;
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, loginGoogle, loginEmail, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}