// 설치 가능성만 충족하는 최소 서비스 워커. 캐싱은 하지 않아 오래된 화면이 남지 않는다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
