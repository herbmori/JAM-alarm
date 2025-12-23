// sw.js - 서비스 워커 (Service Worker)
const CACHE_NAME = "alarm-app-v1";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];

// 설치 (캐싱)
self.addEventListener("install", (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[ServiceWorker] Pre-caching offline page");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 활성화 (구버전 정리)
self.addEventListener("activate", (evt) => {
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[ServiceWorker] Removing old cache", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// fetch 이벤트 (오프라인 지원)
self.addEventListener("fetch", (evt) => {
    if (evt.request.mode !== "navigate") {
        return;
    }
    evt.respondWith(
        fetch(evt.request).catch(() => {
            return caches.open(CACHE_NAME).then((cache) => {
                return cache.match("index.html");
            });
        })
    );
});
