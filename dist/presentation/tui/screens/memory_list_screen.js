import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
import { createList } from '../components/list.js';
export class MemoryListScreen extends TuiScreen {
    memories = [];
    selectedMemory = null;
    list;
    preview;
    get name() {
        return 'memories';
    }
    async mount() {
        await this.loadMemories();
        this.render();
    }
    unmount() {
        this.clear();
    }
    render() {
        this.clear();
        createPanel({
            parent: this.root,
            title: 'Memories',
            width: '60%',
            height: '100%',
        });
        this.list = createList({
            parent: this.root,
            columns: [
                { header: 'Type', width: 12, render: (m) => m.type },
                { header: 'Scope', width: 16, render: (m) => m.scope },
                { header: 'Title', width: 40, render: (m) => m.title },
            ],
            items: this.memories,
            onSelect: (memory) => {
                this.selectedMemory = memory;
                this.updatePreview();
            },
        });
        this.preview = createPanel({
            parent: this.root,
            title: 'Preview',
            width: '40%',
            height: '100%',
            left: '60%',
        });
        this.updatePreview();
        this.list.focus();
    }
    handleGlobalKey(key) {
        switch (key) {
            case 'a':
                this.context.app.navigateTo('edit-memory', { mode: 'create' });
                return true;
            case 'e':
            case 'enter':
                if (this.selectedMemory) {
                    this.context.app.navigateTo('edit-memory', {
                        mode: 'edit',
                        id: this.selectedMemory.id,
                    });
                }
                return true;
            case 'd':
                if (this.selectedMemory) {
                    this.context.app.showModal('Delete Memory', `Delete "${this.selectedMemory.title}"?`, [
                        {
                            label: 'Yes',
                            handler: () => this.deleteSelected(),
                        },
                        { label: 'No', handler: () => void 0 },
                    ]);
                }
                return true;
            default:
                return false;
        }
    }
    async loadMemories() {
        try {
            this.memories = await this.context.container.memoryRepository.list({ limit: 100 });
            if (this.memories.length > 0) {
                this.selectedMemory = this.memories[0];
            }
            this.context.app.showToast(`Loaded ${this.memories.length} memories`, 'info');
        }
        catch (error) {
            this.context.app.showToast(`Failed to load memories: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
    updatePreview() {
        if (!this.preview)
            return;
        if (!this.selectedMemory) {
            this.preview.setContent('No memory selected.');
        }
        else {
            const memory = this.selectedMemory;
            this.preview.setContent([
                `{bold}${memory.title}{/bold}`,
                `ID:    ${memory.id}`,
                `Type:  ${memory.type}`,
                `Scope: ${memory.scope}`,
                `Tags:  ${memory.tags.join(', ') || 'none'}`,
                '',
                memory.content,
            ].join('\n'));
        }
        this.context.app.screen.render();
    }
    async deleteSelected() {
        if (!this.selectedMemory)
            return;
        try {
            await this.context.container.memoryRepository.delete(this.selectedMemory.id);
            await this.context.container.vectorIndex.remove(this.selectedMemory.id);
            this.context.app.showToast(`Deleted ${this.selectedMemory.id}`, 'success');
            await this.loadMemories();
            this.render();
        }
        catch (error) {
            this.context.app.showToast(`Delete failed: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
}
//# sourceMappingURL=memory_list_screen.js.map