import type { FastifyReply } from 'fastify';
export declare class SseManager {
    private channels;
    createChannel(operationId: string): void;
    subscribe(operationId: string, reply: FastifyReply): void;
    send<T>(operationId: string, event: string, data: T): void;
    complete<T>(operationId: string, result: T): void;
    error(operationId: string, message: string): void;
    private formatEvent;
    private closeChannel;
}
export declare const sseManager: SseManager;
//# sourceMappingURL=sse_manager.d.ts.map