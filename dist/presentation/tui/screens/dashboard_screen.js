import blessed from 'neo-blessed';
import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
const items = [
    { label: 'Memories', description: 'Browse, add, edit and delete memories', screen: 'memories' },
    { label: 'Search', description: 'Semantic and keyword search across memories', screen: 'search' },
    { label: 'Sessions', description: 'Review sessions and distill into memories', screen: 'sessions' },
    { label: 'Settings', description: 'Configure vault, embedding provider and API keys', screen: 'settings' },
];
export class DashboardScreen extends TuiScreen {
    list;
    get name() {
        return 'dashboard';
    }
    mount() {
        this.render();
    }
    unmount() {
        this.clear();
    }
    render() {
        this.clear();
        const panel = createPanel({
            parent: this.root,
            title: 'DiamondBlock',
            width: '100%',
            height: '100%',
        });
        blessed.text({
            parent: panel,
            top: 1,
            left: 'center',
            content: '{bold}Local-first semantic memory{/bold}',
            tags: true,
        });
        this.list = blessed.list({
            parent: panel,
            top: 3,
            left: 'center',
            width: '80%',
            height: '100%-6',
            items: items.map((item) => `${item.label.padEnd(12)} ${item.description}`),
            border: { type: 'line' },
            style: {
                item: { fg: 'white' },
                selected: { bg: 'cyan', fg: 'black' },
                border: { fg: 'white' },
            },
            keys: true,
            mouse: true,
            tags: true,
        });
        this.list.on('select', (_value, index) => {
            const selected = items[index];
            if (selected) {
                this.context.app.navigateTo(selected.screen);
            }
        });
        this.list.focus();
    }
}
//# sourceMappingURL=dashboard_screen.js.map