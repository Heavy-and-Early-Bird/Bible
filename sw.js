// sw.js

// v1: Initial PWA cache setup. Increment this version number when you update files.
const CACHE_NAME = 'divine-words-cache-v1';

// A list of all the files that make up the "app shell"
// This needs to include every file your app depends on to run.
const urlsToCache = [
  '.', // IMPORTANT: Caches the root URL, essential for GitHub Pages.
  'index.html',
  'datamanager.html',
  'exporter.html',
  'audiovisual_settings.html',
  'audiovisual_manager.html', // This was missing from the partial list
  'manifest.json',

  // CSS Files
  'styles/style.css',
  'styles/exporter_style.css',

  // JavaScript Files
  'scripts/script.js',
  'scripts/main_app_script.js',
  'scripts/datamanager_script.js',
  'scripts/exporter_script.js',
  'scripts/extractor_script.js',
  'scripts/audiovisual_integrations.js',
  'scripts/audiovisual_settings_script.js',
  'scripts/audiovisual_manager.js',
  'scripts/bulk_reference_compiler.js',
  'scripts/openbible_topics_importer.js',

  // App Icons (as defined in manifest.json)
  'assets/icons/icon.png',
  //'assets/icons/icon-512x512.png',

  // Default Media Assets
//  'assets/images/default1.jpg',
//  'assets/images/default2.jpg',
//  'assets/images/default3.jpg',
//  'assets/sounds/effects/default-chime.mp3',
//  'assets/sounds/effects/default-page-turn.mp3',
//  'assets/sounds/music/default-ambient.mp3',

  // Google Fonts URL - Caching this can be tricky, but let's add it for better offline performance.
  'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;600&family=Roboto+Slab:wght@400;700&display=swap'
];

// --- INSTALL Event ---
// This event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  // We use event.waitUntil to ensure the installation doesn't complete
  // until the caching is finished.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache. Caching app shell...');
        return cache.addAll(urlsToCache);
      })
  );
});

// --- ACTIVATE Event ---
// This event is fired when the new service worker is activated.
// It's the perfect place to clean up old, unused caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If a cache's name is not our current CACHE_NAME, we delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // This line ensures the new service worker takes control immediately.
  return self.clients.claim();
});

// --- FETCH Event ---
// This event intercepts every network request made by the application.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests for our caching strategy.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Use a "Cache First, then Network" strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is found in the cache, return the cached response.
        if (response) {
          return response;
        }

        // If the request is not in the cache, fetch it from the network.
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response from the network.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: We need to clone the response. A response is a stream
            // and because we want the browser to consume the response as well as
            // the cache consuming the response, we need to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Add the new response to the cache for future requests.
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      }).catch(error => {
        // This catch handles cases where both the cache and the network fail.
        // This is common when the user is completely offline and the requested
        // resource was never cached.
        console.error('Service Worker: Fetch failed; returning offline page instead.', error);
        // You could return a custom offline fallback page here if you had one.
        // For now, we'll just let the browser's default offline error show.
      })
  );
});