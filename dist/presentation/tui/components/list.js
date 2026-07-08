import blessed from 'neo-blessed';
export function createList(options) {
    const list = blessed.list({
        parent: options.parent,
        width: '100%',
        height: '100%',
        border: { type: 'line' },
        style: {
            item: { fg: 'white' },
            selected: { bg: 'blue', fg: 'white' },
            border: { fg: 'white' },
        },
        keys: true,
        mouse: true,
        tags: true,
    });
    function refresh() {
        list.setItems(formatItems(options.items, options.columns));
    }
    list.on('select', (_item, index) => {
        if (index >= 0 && index < options.items.length) {
            options.onSelect?.(options.items[index], index);
        }
    });
    refresh();
    return list;
}
function formatItems(items, columns) {
    return items.map((item) => columns.map((col) => padOrTruncate(col.render(item), col.width)).join(' '));
}
function padOrTruncate(text, width) {
    if (text.length > width)
        return text.slice(0, width - 1) + '…';
    return text.padEnd(width, ' ');
}
//# sourceMappingURL=list.js.map