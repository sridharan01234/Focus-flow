// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
firebase.initializeApp({
  apiKey: 'AIzaSyCZII37Vm4rlEKqBUBwrQMSJL7vE8qEjMA',
  authDomain: 'studio-2705179619-e376d.firebaseapp.com',
  projectId: 'studio-2705179619-e376d',
  storageBucket: 'studio-2705179619-e376d.appspot.com',
  messagingSenderId: '533733919681',
  appId: '1:533733919681:web:a57016c2cc55e6edf93d40'
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extract title and body from data payload (not notification payload)
  const notificationTitle = payload.data?.title || 'FocusFlow';
  const notificationBody = payload.data?.body || 'You have a new notification';
  const notificationId = payload.data?.notificationId || payload.data?.event || payload.messageId || `ff-${Date.now()}`;
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: notificationId,
    data: payload.data,
    requireInteraction: false,
  };

  return self.registration.getNotifications({ tag: notificationOptions.tag }).then(existing => {
    existing.forEach(notification => notification.close());
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.', event);
  event.notification.close();

  // Open the app
  event.waitUntil(
    clients.openWindow('/')
  );
});
