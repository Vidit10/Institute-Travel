// Minimal service worker: enables PWA installability and web-push notifications.
// See docs/SPEC.md section 10.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title || "Campus Travel", {
      body: payload.body,
      icon: "/icon.svg",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
