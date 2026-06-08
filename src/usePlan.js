import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export function usePlan(user) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    initPlan(user);
  }, [user]);

  const initPlan = async (user) => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // مستخدم جديد — 1 day Pro trial
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const data = {
        uid: user.uid,
        email: user.email,
        plan: 'trial',
        trialEnd: trialEnd.toISOString(),
        createdAt: now.toISOString(),
        chatCount: 0,
        chatDate: now.toDateString(),
        watchlistCount: 0,
      };
      await setDoc(ref, data);
      setPlan(data);
    } else {
      const data = snap.data();
      // تحقق إذا Trial انتهت
      if (data.plan === 'trial' && new Date() > new Date(data.trialEnd)) {
        await updateDoc(ref, { plan: 'free' });
        setPlan({ ...data, plan: 'free' });
      } else {
        setPlan(data);
      }
    }
    setLoading(false);
  };

  const isPro = () => plan?.plan === 'pro' || plan?.plan === 'trial';

  const canChat = async () => {
    if (isPro()) return true;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const data = snap.data();
    const today = new Date().toDateString();
    if (data.chatDate !== today) {
      await updateDoc(ref, { chatCount: 0, chatDate: today });
      return true;
    }
    return data.chatCount < 5;
  };

  const incrementChat = async () => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const data = snap.data();
    const today = new Date().toDateString();
    const count = data.chatDate === today ? data.chatCount + 1 : 1;
    await updateDoc(ref, { chatCount: count, chatDate: today });
    setPlan(prev => ({ ...prev, chatCount: count, chatDate: today }));
  };

  const canAddWatchlist = () => {
    if (isPro()) return true;
    return (plan?.watchlistCount || 0) < 10;
  };

  const incrementWatchlist = async (add = true) => {
    const ref = doc(db, 'users', user.uid);
    const newCount = (plan?.watchlistCount || 0) + (add ? 1 : -1);
    await updateDoc(ref, { watchlistCount: Math.max(0, newCount) });
    setPlan(prev => ({ ...prev, watchlistCount: Math.max(0, newCount) }));
  };

  return { plan, loading, isPro, canChat, incrementChat, canAddWatchlist, incrementWatchlist };
}