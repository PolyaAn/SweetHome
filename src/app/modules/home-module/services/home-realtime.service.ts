import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HomeRealtimeMessage } from '../models/home.model';

const RECONNECT_DELAY_MS = 5000;

@Injectable()
export class HomeRealtimeService {
  private readonly messagesSubject = new Subject<HomeRealtimeMessage>();
  private socket: WebSocket | null = null;
  private reconnectStarted = false;

  readonly messages$: Observable<HomeRealtimeMessage> = this.messagesSubject.asObservable();

  constructor(private zone: NgZone) {
  }

  connect(): void {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      return;
    }

    this.socket = new WebSocket(this.buildUrl());

    this.socket.onmessage = (event) => {
      const message = this.parseMessage(event.data);

      if (!message) {
        return;
      }

      this.zone.run(() => this.messagesSubject.next(message));
    };

    this.socket.onclose = () => this.scheduleReconnect();
    this.socket.onerror = () => this.socket?.close();
  }

  private scheduleReconnect(): void {
    if (this.reconnectStarted) {
      return;
    }

    this.reconnectStarted = true;
    this.socket = null;

    timer(RECONNECT_DELAY_MS).subscribe(() => {
      this.reconnectStarted = false;
      this.connect();
    });
  }

  private parseMessage(data: unknown): HomeRealtimeMessage | null {
    if (typeof data !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(data) as HomeRealtimeMessage;
      return typeof parsed?.type === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private buildUrl(): string {
    const apiUrl = new URL(environment.apiHost || window.location.origin, window.location.origin);
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${apiUrl.host}/ws/home`;
  }
}
