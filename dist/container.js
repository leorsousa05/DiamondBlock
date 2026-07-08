let container = null;
export function setContainer(c) {
    container = c;
}
export function getContainer() {
    if (!container) {
        throw new Error('Container not initialized');
    }
    return container;
}
//# sourceMappingURL=container.js.map