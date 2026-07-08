import blessed from 'neo-blessed';
export function createModal(options) {
    const modal = blessed.box({
        parent: options.parent,
        top: 'center',
        left: 'center',
        width: '50%',
        height: '30%',
        border: { type: 'line' },
        label: options.title,
        tags: true,
        style: {
            border: { fg: 'white' },
            bg: 'black',
        },
    });
    blessed.text({
        parent: modal,
        top: 1,
        left: 1,
        right: 1,
        content: options.message,
        tags: true,
        wrap: true,
    });
    let left = 2;
    options.actionLabels.forEach((label, index) => {
        const button = blessed.button({
            parent: modal,
            bottom: 1,
            left,
            width: label.length + 4,
            height: 3,
            content: label,
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'blue',
                focus: { bg: 'cyan' },
            },
        });
        button.on('press', () => options.onAction(index));
        left += label.length + 6;
    });
    modal.focus();
    return modal;
}
//# sourceMappingURL=modal.js.map