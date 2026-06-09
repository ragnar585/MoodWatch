import { useEffect, useRef } from 'react';
import { initializePaddle } from '@paddle/paddle-js';
import { PADDLE_CONFIG } from './paddleConfig';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export function usePaddle(user, onSuccess) {
  const paddleRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    initializePaddle({
      token: PADDLE_CONFIG.clientToken,
      eventCallback: async (event) => {
        if (event.name === 'checkout.completed') {
          // Update Firestore — set plan to pro
          if (user?.uid) {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                plan: 'pro',
                proSince: new Date().toISOString(),
              }, { merge: true });
            } catch (e) {
              console.error('Firestore update error:', e);
            }
          }
          onSuccessRef.current && onSuccessRef.current();
        }
      },
    }).then(p => {
      paddleRef.current = p;
    });
  }, [user]);

  const openCheckout = () => {
    if (!paddleRef.current || !user) return;
    paddleRef.current.Checkout.open({
      items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }],
      customer: { email: user.email },
    });
  };

  return { openCheckout };
}