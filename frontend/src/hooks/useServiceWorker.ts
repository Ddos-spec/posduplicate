import { useEffect, useState } from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (swNeedRefresh) {
      setNeedRefresh(true);
    }
  }, [swNeedRefresh]);

  const refresh = () => {
    updateServiceWorker(true);
  };

  const close = () => {
    setOfflineReady(false);
    setSwNeedRefresh(false);
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    offlineReady,
    refresh,
    close,
  };
}
