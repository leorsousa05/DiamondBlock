export function createSession(input, id) {
    return {
        id: id ?? generateId('sess'),
        projectId: input.projectId,
        createdAt: new Date(),
        messages: input.messages,
    };
}
export function sessionToPlainText(session) {
    return session.messages
        .map((m) => `[${m.role}] ${m.content}`)
        .join('\n\n');
}
function generateId(prefix) {
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}`;
}
//# sourceMappingURL=session.js.map