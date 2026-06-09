import { useEffect, useState } from 'react';
import { initializePaddle } from '@paddle/paddle-js';
import { PADDLE_CONFIG } from './paddleConfig';

export function usePaddle(user, onSuccess) {
  const [paddle, setPaddle] = useState(null);

  useEffect(() => {
    initializePaddle({
      token: PADDLE_CONFIG.clientToken,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          onSuccess && onSuccess();
        }
      },
    }).then(p => setPaddle(p));
  }, []);

  const openCheckout = () => {
    if (!paddle || !user) return;
    paddle.Checkout.open({
      items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }],
      customer: { email: user.email },
    });
  };

  return { openCheckout };
}