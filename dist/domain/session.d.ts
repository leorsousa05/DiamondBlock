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
export declare function createSession(input: SessionInput, id?: string): Session;
export declare function sessionToPlainText(session: Session): string;
//# sourceMappingURL=session.d.ts.map