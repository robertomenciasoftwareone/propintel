import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PwaService {
  installable = signal(false);
  swReady = signal(false);
  notifPermission = signal<NotificationPermission>('default');

  private _deferredPrompt: any = null;

  constructor() {
    if (typeof window === 'undefined') return;

    this._registerSW();
    this._listenInstall();
    this.notifPermission.set(
      'Notification' in window ? Notification.permission : 'denied'
    );
  }

  private _registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(() => this.swReady.set(true))
        .catch(err => console.warn('[PWA] SW registration failed:', err));
    }
  }

  private _listenInstall() {
    window.addEventListener('beforeinstallprompt', (ev: any) => {
      ev.preventDefault();
      this._deferredPrompt = ev;
      this.installable.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.installable.set(false);
      this._deferredPrompt = null;
    });
  }

  async promptInstall(): Promise<boolean> {
    if (!this._deferredPrompt) return false;
    this._deferredPrompt.prompt();
    const { outcome } = await this._deferredPrompt.userChoice;
    this._deferredPrompt = null;
    this.installable.set(false);
    return outcome === 'accepted';
  }

  async requestNotifications(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    this.notifPermission.set(perm);
    return perm === 'granted';
  }

  async subscribePush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.swReady()) return null;
    const reg = await navigator.serviceWorker.ready;
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8(vapidPublicKey),
      });
      return sub;
    } catch {
      return null;
    }
  }

  private _urlBase64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
