import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyReply } from 'fastify';
import { SseManager } from './sse_manager.js';

function makeMockReply(): FastifyReply {
  return {
    raw: {
      write: vi.fn(),
      end: vi.fn(),
    },
  } as unknown as FastifyReply;
}

describe('SseManager', () => {
  let manager: SseManager;

  beforeEach(() => {
    manager = new SseManager();
  });

  it('createChannel registers an empty channel', () => {
    manager.createChannel('op1');
    // No subscribers yet; send should not throw
    expect(() => manager.send('op1', 'test', { foo: 'bar' })).not.toThrow();
  });

  it('subscribe adds a reply to the channel', () => {
    const reply = makeMockReply();
    manager.subscribe('op1', reply);
    manager.send('op1', 'progress', { value: 42 });
    expect(reply.raw.write).toHaveBeenCalledOnce();
  });

  it('send formats event as SSE text/event-stream', () => {
    const reply = makeMockReply();
    manager.subscribe('op1', reply);
    manager.send('op1', 'progress', { value: 1 });

    const written = (reply.raw.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(written).toContain('event: progress\n');
    expect(written).toContain('data: {"value":1}\n');
    expect(written).toMatch(/\n\n$/);
  });

  it('complete sends complete event and closes channel', () => {
    const reply = makeMockReply();
    manager.subscribe('op1', reply);
    manager.complete('op1', { ok: true });

    expect(reply.raw.write).toHaveBeenCalledOnce();
    const written = (reply.raw.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(written).toContain('event: complete\n');
    expect(written).toContain('"ok":true');
    expect(reply.raw.end).toHaveBeenCalledOnce();

    // Channel is removed — further sends should be no-ops
    const writeCalls = (reply.raw.write as ReturnType<typeof vi.fn>).mock.calls.length;
    manager.send('op1', 'anything', {});
    expect((reply.raw.write as ReturnType<typeof vi.fn>).mock.calls.length).toBe(writeCalls);
  });

  it('error sends error event with message and closes channel', () => {
    const reply = makeMockReply();
    manager.subscribe('op1', reply);
    manager.error('op1', 'Something went wrong');

    expect(reply.raw.write).toHaveBeenCalledOnce();
    const written = (reply.raw.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(written).toContain('event: error\n');
    expect(written).toContain('"message":"Something went wrong"');
    expect(reply.raw.end).toHaveBeenCalledOnce();
  });

  it('multiple subscribers all receive events', () => {
    const r1 = makeMockReply();
    const r2 = makeMockReply();
    manager.subscribe('op1', r1);
    manager.subscribe('op1', r2);
    manager.send('op1', 'ping', {});

    expect(r1.raw.write).toHaveBeenCalledOnce();
    expect(r2.raw.write).toHaveBeenCalledOnce();
  });

  it('complete closes all subscribers', () => {
    const r1 = makeMockReply();
    const r2 = makeMockReply();
    manager.subscribe('op1', r1);
    manager.subscribe('op1', r2);
    manager.complete('op1', { done: true });

    expect(r1.raw.end).toHaveBeenCalledOnce();
    expect(r2.raw.end).toHaveBeenCalledOnce();
  });

  it('send on non-existent channel is a no-op', () => {
    expect(() => manager.send('ghost', 'event', {})).not.toThrow();
  });

  it('createChannel is idempotent', () => {
    manager.createChannel('op1');
    const reply = makeMockReply();
    manager.subscribe('op1', reply);
    manager.createChannel('op1'); // should not clear existing subscribers
    manager.send('op1', 'test', {});
    expect(reply.raw.write).toHaveBeenCalled();
  });

  it('write errors are swallowed gracefully', () => {
    const reply = {
      raw: {
        write: vi.fn().mockImplementation(() => { throw new Error('EPIPE'); }),
        end: vi.fn(),
      },
    } as unknown as FastifyReply;

    manager.subscribe('op1', reply);
    expect(() => manager.send('op1', 'event', {})).not.toThrow();
  });
});
