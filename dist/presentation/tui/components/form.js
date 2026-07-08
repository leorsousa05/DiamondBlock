import blessed from 'neo-blessed';
function isPrintable(ch) {
    return !!ch && ch.length > 0 && ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127;
}
export function createForm(options) {
    const root = blessed.box({
        parent: options.parent,
        width: '100%',
        height: '100%',
        tags: true,
    });
    const fields = new Map();
    const labels = new Map();
    let top = 0;
    for (const field of options.fields) {
        const label = blessed.text({
            parent: root,
            top,
            left: 0,
            content: field.label,
            style: {
                fg: 'gray',
                bold: false,
            },
        });
        labels.set(field.name, label);
        top += 1;
        const input = blessed.box({
            parent: root,
            top,
            left: 0,
            width: '100%',
            height: field.multiline ? 6 : 3,
            border: { type: 'line' },
            content: field.value ?? '',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            keys: true,
            mouse: true,
            style: {
                border: { fg: 'white' },
                focus: { border: { fg: 'cyan' } },
            },
        });
        input.on('focus', () => {
            label.style.fg = 'cyan';
            label.style.bold = true;
            input.style.border = { fg: 'cyan' };
            root.screen?.render();
        });
        input.on('blur', () => {
            label.style.fg = 'gray';
            label.style.bold = false;
            input.style.border = { fg: 'white' };
            root.screen?.render();
        });
        input.on('keypress', (ch, key) => {
            const name = key?.name ?? '';
            const current = input.getContent();
            if (name === 'tab') {
                focusNext();
                return;
            }
            if (name === 'escape') {
                options.onCancel?.();
                return;
            }
            if (name === 'enter' || name === 'return') {
                if (field.multiline) {
                    input.setContent(current + '\n');
                    input.scrollTo(input.getScrollHeight());
                }
                else {
                    focusNext();
                }
                return;
            }
            if (name === 'backspace') {
                input.setContent(current.slice(0, -1));
                return;
            }
            if (isPrintable(ch)) {
                input.setContent(current + ch);
                input.scrollTo(input.getScrollHeight());
            }
        });
        fields.set(field.name, input);
        top += (field.multiline ? 6 : 3) + 1;
    }
    function focusNext() {
        const ordered = Array.from(fields.values());
        const current = ordered.findIndex((f) => f.focused);
        const next = current >= 0 ? (current + 1) % ordered.length : 0;
        ordered[next]?.focus();
    }
    return {
        root,
        fields,
        labels,
        focus: () => {
            const first = Array.from(fields.values())[0];
            first?.focus();
        },
        focusNext,
        getValues: () => {
            const values = {};
            for (const [name, input] of fields) {
                values[name] = input.getContent();
            }
            return values;
        },
    };
}
//# sourceMappingURL=form.js.map