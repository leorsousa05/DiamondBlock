import blessed from 'neo-blessed';
import { ListSessionsUseCase } from '../../../application/use_cases/list_sessions.js';
import { DistillSessionsUseCase } from '../../../application/use_cases/distill_sessions.js';
import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
import { createList } from '../components/list.js';
export class SessionsScreen extends TuiScreen {
    sessions = [];
    list;
    get name() {
        return 'sessions';
    }
    async mount() {
        await this.loadSessions();
        this.render();
    }
    unmount() {
        this.clear();
    }
    render() {
        this.clear();
        createPanel({
            parent: this.root,
            title: 'Sessions',
            width: '100%',
            height: '100%',
        });
        this.list = createList({
            parent: this.root,
            columns: [
                { header: 'ID', width: 24, render: (s) => s.id },
                { header: 'Project', width: 24, render: (s) => s.projectId },
                { header: 'Date', width: 28, render: (s) => s.createdAt.toISOString() },
                { header: 'Msgs', width: 6, render: (s) => String(s.messages.length) },
            ],
            items: this.sessions,
            onSelect: () => void 0,
        });
        blessed.text({
            parent: this.root,
            bottom: 2,
            left: 0,
            content: 'r - Distill unprocessed sessions | Esc - dashboard',
        });
        this.list.focus();
    }
    handleGlobalKey(key) {
        switch (key) {
            case 'r':
                this.distill();
                return true;
            case 'escape':
                this.context.app.navigateTo('dashboard');
                return true;
            default:
                return false;
        }
    }
    async loadSessions() {
        try {
            const useCase = new ListSessionsUseCase(this.context.container.sessionRepository);
            this.sessions = await useCase.execute({ limit: 50 });
            this.context.app.showToast(`Loaded ${this.sessions.length} sessions`, 'info');
        }
        catch (error) {
            this.context.app.showToast(`Failed to load sessions: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
    async distill() {
        try {
            const useCase = new DistillSessionsUseCase(this.context.container.memoryRepository, this.context.container.sessionRepository);
            const result = await useCase.execute({ limit: 10 });
            this.context.app.showToast(`Distilled ${result.processed} sessions into ${result.memoriesCreated} memories`, 'success');
            await this.loadSessions();
            this.render();
        }
        catch (error) {
            this.context.app.showToast(`Distillation failed: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
}
//# sourceMappingURL=sessions_screen.js.map