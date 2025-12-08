import { useServiceWorker } from '../../hooks/useServiceWorker';

export default function PWARefreshPrompt() {
  const { needRefresh, offlineReady, refresh, close } = useServiceWorker();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        {needRefresh && (
          <>
            <p className="text-sm font-medium text-gray-900 mb-3">
              Update tersedia! Refresh untuk versi terbaru.
            </p>
            <div className="flex gap-2">
              <button
                onClick={refresh}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={close}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Nanti
              </button>
            </div>
          </>
        )}
        {offlineReady && (
          <>
            <p className="text-sm text-gray-700 mb-2">
              App siap digunakan offline
            </p>
            <button
              onClick={close}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}
