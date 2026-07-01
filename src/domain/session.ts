export type MessageRole = 'user' | 'assistant' | 'system';

export interface SessionMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  projectId: string;
  createdAt: Date;
  messages: SessionMessage[];
}

export interface SessionInput {
  projectId: string;
  messages: SessionMessage[];
}

export function createSession(input: SessionInput, id?: string): Session {
  return {
    id: id ?? generateId('sess'),
    projectId: input.projectId,
    createdAt: new Date(),
    messages: input.messages,
  };
}

export function sessionToPlainText(session: Session): string {
  return session.messages
    .map((m) => `[${m.role}] ${m.content}`)
    .join('\n\n');
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${random}`;
}
