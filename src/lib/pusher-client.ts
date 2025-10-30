import PusherClient from 'pusher-js';

let pusherClient: PusherClient | null = null;

export function getPusherClient() {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClient;
}
