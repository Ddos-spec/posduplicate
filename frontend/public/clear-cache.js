// Clear Service Worker Cache Utility
// Run this in browser console if you need to manually clear cache:
// fetch('/clear-cache.js').then(r => r.text()).then(eval)

(async function clearAllCaches() {
  console.log('Clearing all service worker caches...');

  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Unregistered service worker:', registration);
    }
  }

  // Clear all caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      console.log('Deleted cache:', cacheName);
    }
  }

  console.log('All caches cleared! Please reload the page.');
  alert('Cache cleared successfully! The page will reload now.');
  window.location.reload();
})();
