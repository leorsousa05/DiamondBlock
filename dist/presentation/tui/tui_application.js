import blessed from 'neo-blessed';
export class TuiApplication {
    container;
    screen;
    statusBar;
    screens = new Map();
    currentScreen = null;
    history = [];
    modal = null;
    toastTimer = null;
    constructor(options) {
        this.container = options.container;
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'DiamondBlock',
            fullUnicode: true,
            mouse: true,
        });
        this.statusBar = this.createStatusBar(options.noColor);
        this.attachGlobalKeys();
    }
    register(name, screen) {
        this.screens.set(name, screen);
    }
    navigateTo(name, params) {
        const target = this.screens.get(name);
        if (!target) {
            this.showToast(`Screen not found: ${name}`, 'error');
            return;
        }
        if (this.currentScreen) {
            this.currentScreen.hide();
            this.currentScreen.unmount();
        }
        if (this.currentScreen?.name !== name) {
            this.history.push(name);
        }
        this.currentScreen = target;
        target.setParams(params ?? {});
        target.show();
        target.mount();
        target.render();
        this.updateStatusBar();
        this.screen.render();
    }
    goBack() {
        if (this.history.length > 1) {
            this.history.pop();
            const previous = this.history[this.history.length - 1];
            this.navigateTo(previous);
        }
        else {
            this.navigateTo('dashboard');
        }
    }
    showToast(message, type = 'info') {
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
            this.toastTimer = null;
        }
        const colors = {
            info: 'blue',
            success: 'green',
            error: 'red',
            warning: 'yellow',
        };
        this.statusBar.setContent(`{${colors[type]}-fg}${message}{/}`);
        this.screen.render();
        this.toastTimer = setTimeout(() => {
            this.updateStatusBar();
        }, 3000);
    }
    showModal(title, message, actions) {
        if (this.modal) {
            this.modal.destroy();
            this.modal = null;
        }
        const width = Math.min(60, this.screen.width - 4);
        const height = Math.min(12, this.screen.height - 4);
        const modal = blessed.box({
            parent: this.screen,
            top: 'center',
            left: 'center',
            width,
            height,
            border: { type: 'line' },
            label: title,
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
            content: message,
            tags: true,
            wrap: true,
        });
        let left = 2;
        for (const action of actions) {
            const button = blessed.button({
                parent: modal,
                bottom: 1,
                left,
                width: action.label.length + 4,
                height: 3,
                content: action.label,
                border: { type: 'line' },
                style: {
                    fg: 'white',
                    bg: 'blue',
                    focus: { bg: 'cyan' },
                },
            });
            button.on('press', () => {
                this.hideModal();
                action.handler();
            });
            left += action.label.length + 6;
        }
        modal.focus();
        this.modal = modal;
        this.screen.render();
    }
    start() {
        if (!this.currentScreen) {
            this.navigateTo('dashboard');
        }
        return Promise.resolve();
    }
    stop() {
        if (this.toastTimer) {
            clearTimeout(this.toastTimer);
            this.toastTimer = null;
        }
        this.hideModal();
        this.screen.destroy();
    }
    hideModal() {
        if (this.modal) {
            this.modal.destroy();
            this.modal = null;
            this.screen.render();
        }
    }
    updateStatusBar() {
        const hints = {
            dashboard: '↑↓ navigate | Enter select | q quit',
            memories: '↑↓ select | a add | e/Enter edit | d delete | Esc home',
            'edit-memory': 'Tab move | Ctrl+S save | Esc cancel',
            search: '/ focus query | Enter search | ↑↓ results | Esc home',
            sessions: 'r distill | Esc home',
            settings: 'Tab move | Ctrl+S save | Esc home',
        };
        const current = this.currentScreen?.name;
        const hint = current ? hints[current] ?? '' : '';
        this.statusBar.setContent(`DiamondBlock | ${current ?? ''} | ${hint}`);
        this.screen.render();
    }
    createStatusBar(noColor) {
        return blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: '',
            style: noColor ? {} : { fg: 'white', bg: 'blue' },
        });
    }
    attachGlobalKeys() {
        this.screen.key(['q', 'C-c'], () => {
            this.stop();
            process.exit(0);
        });
        this.screen.key(['1', 'f1'], () => this.navigateTo('dashboard'));
        this.screen.key(['2', 'f2'], () => this.navigateTo('memories'));
        this.screen.key(['3', 'f3'], () => this.navigateTo('search'));
        this.screen.key(['4', 'f4'], () => this.navigateTo('sessions'));
        this.screen.key(['5', 'f5'], () => this.navigateTo('settings'));
        this.screen.on('keypress', (ch, key) => {
            const name = key?.name ?? String(ch ?? '');
            if (this.modal) {
                if (name === 'escape' || name === 'q') {
                    this.hideModal();
                }
                return;
            }
            if (this.currentScreen?.handleGlobalKey(name)) {
                return;
            }
            if (name === 'escape') {
                this.goBack();
            }
        });
    }
}
//# sourceMappingURL=tui_application.js.map