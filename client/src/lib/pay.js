import { useEffect, useState } from 'react';
import { api } from '../context/store';

/** Is paying online (the payment gateway) set up on this server? The "Pay online" choice only appears when it is. */
export function useGateway() {
  const [on, setOn] = useState(false);
  useEffect(() => { api.get('/pay/status').then((r) => setOn(!!r.data.gateway)).catch(() => {}); }, []);
  return on;
}

/** The ways a payment setting offers right now. `manual` = send money by hand and give the transaction ID; `online` = the gateway page. */
export const waysOf = (cfg, gateway) => ({ manual: cfg?.manual !== false, online: !!cfg?.online && !!gateway });
/** The way the person chose (the first one offered until they choose). */
export const modeOf = (cfg, gateway, value) => { const w = waysOf(cfg, gateway); return value?.mode === 'online' && w.online ? 'online' : value?.mode === 'manual' && w.manual ? 'manual' : w.manual ? 'manual' : 'online'; };
