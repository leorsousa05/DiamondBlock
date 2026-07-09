import type { FastifyReply } from 'fastify';

export class SseManager {
  private channels: Map<string, FastifyReply[]> = new Map();

  createChannel(operationId: string): void {
    if (!this.channels.has(operationId)) {
      this.channels.set(operationId, []);
    }
  }

  subscribe(operationId: string, reply: FastifyReply): void {
    if (!this.channels.has(operationId)) {
      this.channels.set(operationId, []);
    }
    this.channels.get(operationId)!.push(reply);
  }

  send<T>(operationId: string, event: string, data: T): void {
    const subscribers = this.channels.get(operationId);
    if (!subscribers) return;

    const formatted = this.formatEvent(event, data);
    for (const reply of subscribers) {
      try {
        reply.raw.write(formatted);
      } catch {
        // ignore write errors on closed connections
      }
    }
  }

  complete<T>(operationId: string, result: T): void {
    this.send(operationId, 'complete', result);
    this.closeChannel(operationId);
  }

  error(operationId: string, message: string): void {
    this.send(operationId, 'error', { message });
    this.closeChannel(operationId);
  }

  private formatEvent(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  private closeChannel(operationId: string): void {
    const subscribers = this.channels.get(operationId);
    if (!subscribers) return;

    for (const reply of subscribers) {
      try {
        reply.raw.end();
      } catch {
        // ignore errors on already-closed connections
      }
    }
    this.channels.delete(operationId);
  }
}

export const sseManager = new SseManager();
