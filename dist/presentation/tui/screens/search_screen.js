import blessed from 'neo-blessed';
import { SearchMemoryUseCase } from '../../../application/use_cases/search_memory.js';
import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
import { createList } from '../components/list.js';
function isPrintable(ch) {
    return !!ch && ch.length > 0 && ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) < 127;
}
export class SearchScreen extends TuiScreen {
    query = '';
    results = [];
    input;
    resultList;
    get name() {
        return 'search';
    }
    mount() {
        this.render();
    }
    unmount() {
        this.clear();
    }
    render() {
        this.clear();
        createPanel({
            parent: this.root,
            title: 'Search',
            width: '100%',
            height: '100%',
        });
        blessed.text({
            parent: this.root,
            top: 1,
            left: 0,
            content: 'Query:',
        });
        this.input = blessed.box({
            parent: this.root,
            top: 2,
            left: 0,
            width: '100%',
            height: 3,
            border: { type: 'line' },
            content: this.query,
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
        this.input.on('keypress', (ch, key) => {
            const name = key?.name ?? '';
            const current = this.input.getContent();
            if (name === 'enter' || name === 'return') {
                this.search();
                return;
            }
            if (name === 'escape') {
                this.context.app.goBack();
                return;
            }
            if (name === 'tab') {
                this.resultList.focus();
                return;
            }
            if (name === 'backspace') {
                this.input.setContent(current.slice(0, -1));
                return;
            }
            if (isPrintable(ch)) {
                this.input.setContent(current + ch);
                this.input.scrollTo(this.input.getScrollHeight());
            }
        });
        const resultsPanel = createPanel({
            parent: this.root,
            title: 'Results',
            top: 6,
            left: 0,
            width: '100%',
            height: '100%-9',
        });
        this.resultList = createList({
            parent: resultsPanel,
            columns: [
                { header: 'Score', width: 8, render: (r) => r.score.toFixed(3) },
                { header: 'Title', width: 50, render: (r) => r.title },
                { header: 'ID', width: 24, render: (r) => r.id },
            ],
            items: this.results,
            onSelect: (result) => {
                this.context.app.navigateTo('edit-memory', { mode: 'edit', id: result.id });
            },
        });
        blessed.text({
            parent: this.root,
            bottom: 2,
            left: 0,
            content: 'Enter search | Tab results | Esc back',
        });
        this.input.focus();
    }
    handleGlobalKey(key) {
        switch (key) {
            case '/':
                this.input.focus();
                return true;
            case 'escape':
                this.context.app.goBack();
                return true;
            default:
                return false;
        }
    }
    async search() {
        this.query = this.input.getContent().trim();
        if (!this.query)
            return;
        try {
            const useCase = new SearchMemoryUseCase(this.context.container.memoryRepository, this.context.container.vectorIndex, this.context.container.embeddingProvider);
            this.results = await useCase.execute({ query: this.query, limit: 20 });
            this.render();
            this.context.app.showToast(`Found ${this.results.length} results`, 'info');
        }
        catch (error) {
            this.context.app.showToast(`Search failed: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
}
//# sourceMappingURL=search_screen.js.map