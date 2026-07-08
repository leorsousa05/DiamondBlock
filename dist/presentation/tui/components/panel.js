import blessed from 'neo-blessed';
export function createPanel(options) {
    return blessed.box({
        parent: options.parent,
        label: options.title,
        width: options.width ?? '100%',
        height: options.height ?? '100%',
        left: options.left ?? 0,
        top: options.top ?? 0,
        border: { type: 'line' },
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        mouse: true,
        style: {
            border: { fg: options.focused ? 'cyan' : 'white' },
        },
    });
}
//# sourceMappingURL=panel.js.map