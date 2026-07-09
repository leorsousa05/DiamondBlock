export class SseManager {
    channels = new Map();
    createChannel(operationId) {
        if (!this.channels.has(operationId)) {
            this.channels.set(operationId, []);
        }
    }
    subscribe(operationId, reply) {
        if (!this.channels.has(operationId)) {
            this.channels.set(operationId, []);
        }
        this.channels.get(operationId).push(reply);
    }
    send(operationId, event, data) {
        const subscribers = this.channels.get(operationId);
        if (!subscribers)
            return;
        const formatted = this.formatEvent(event, data);
        for (const reply of subscribers) {
            try {
                reply.raw.write(formatted);
            }
            catch {
                // ignore write errors on closed connections
            }
        }
    }
    complete(operationId, result) {
        this.send(operationId, 'complete', result);
        this.closeChannel(operationId);
    }
    error(operationId, message) {
        this.send(operationId, 'error', { message });
        this.closeChannel(operationId);
    }
    formatEvent(event, data) {
        return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    }
    closeChannel(operationId) {
        const subscribers = this.channels.get(operationId);
        if (!subscribers)
            return;
        for (const reply of subscribers) {
            try {
                reply.raw.end();
            }
            catch {
                // ignore errors on already-closed connections
            }
        }
        this.channels.delete(operationId);
    }
}
export const sseManager = new SseManager();
//# sourceMappingURL=sse_manager.js.map