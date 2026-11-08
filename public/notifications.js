self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Waymark', {
      body: '求职动态有更新，打开助理查看。',
      icon: '/brand/mark.svg',
      tag: 'waymark-status',
    }),
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/?view=updates'))
})
