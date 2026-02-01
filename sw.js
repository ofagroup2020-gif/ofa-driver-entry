// 最低限のSW（表示を安定させる）
self.addEventListener("install", (e)=> self.skipWaiting());
self.addEventListener("activate", (e)=> self.clients.claim());
