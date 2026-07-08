import blessed from 'neo-blessed';
export class TuiScreen {
    context;
    root;
    _params = {};
    constructor(context) {
        this.context = context;
        this.root = this.createRoot();
    }
    show() {
        this.root.show();
    }
    hide() {
        this.root.hide();
    }
    setParams(params) {
        this._params = params;
    }
    get params() {
        return this._params;
    }
    clear() {
        const children = this.root.children;
        for (const child of [...children]) {
            child.detach();
        }
    }
    createRoot() {
        return blessed.box({
            parent: this.context.screen,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%-1',
            tags: true,
            hidden: true,
        });
    }
    handleGlobalKey(_key) {
        return false;
    }
}
//# sourceMappingURL=tui_screen.js.map