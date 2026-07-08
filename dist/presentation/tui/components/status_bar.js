import blessed from 'neo-blessed';
export function createStatusBar(options) {
    return blessed.box({
        parent: options.parent,
        bottom: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: options.content ?? '',
        style: options.noColor ? {} : { fg: 'white', bg: 'blue' },
    });
}
//# sourceMappingURL=status_bar.js.map