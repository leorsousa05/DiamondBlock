import blessed from 'neo-blessed';
import { SaveMemoryUseCase } from '../../../application/use_cases/save_memory.js';
import { UpdateMemoryUseCase } from '../../../application/use_cases/update_memory.js';
import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
import { createForm } from '../components/form.js';
export class MemoryEditScreen extends TuiScreen {
    form;
    mode = 'create';
    memoryId;
    get name() {
        return 'edit-memory';
    }
    async mount() {
        this.mode = this.params.mode ?? 'create';
        this.memoryId = this.params.id;
        this.render();
    }
    unmount() {
        this.clear();
    }
    async render() {
        this.clear();
        const title = this.mode === 'edit' ? 'Edit Memory' : 'Add Memory';
        createPanel({
            parent: this.root,
            title,
            width: '100%',
            height: '100%',
        });
        const fields = await this.buildFields();
        this.form = createForm({
            parent: this.root,
            fields,
            onSubmit: () => this.save(),
            onCancel: () => this.context.app.goBack(),
        });
        const buttonRow = blessed.box({
            parent: this.root,
            bottom: 2,
            left: 0,
            width: '100%',
            height: 3,
            tags: true,
        });
        const saveButton = blessed.button({
            parent: buttonRow,
            left: 0,
            width: 12,
            height: 3,
            content: 'Save',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'green',
                focus: { bg: 'cyan' },
            },
        });
        const cancelButton = blessed.button({
            parent: buttonRow,
            left: 14,
            width: 14,
            height: 3,
            content: 'Cancel',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'red',
                focus: { bg: 'cyan' },
            },
        });
        saveButton.on('press', () => this.save());
        cancelButton.on('press', () => this.context.app.goBack());
        this.form.focus();
        this.attachKeys();
    }
    handleGlobalKey(key) {
        if (key === 'escape') {
            this.context.app.goBack();
            return true;
        }
        return false;
    }
    attachKeys() {
        this.context.screen.key(['C-s'], () => this.save());
    }
    async buildFields() {
        if (this.mode === 'edit' && this.memoryId) {
            const memory = await this.context.container.memoryRepository.findById(this.memoryId);
            if (memory) {
                return [
                    { name: 'title', label: 'Title', value: memory.title },
                    { name: 'type', label: 'Type (user/project/knowledge/distilled)', value: memory.type },
                    { name: 'scope', label: 'Scope', value: memory.scope },
                    { name: 'tags', label: 'Tags (comma separated)', value: memory.tags.join(', ') },
                    { name: 'content', label: 'Content', value: memory.content, multiline: true },
                ];
            }
        }
        return [
            { name: 'title', label: 'Title', value: '' },
            { name: 'type', label: 'Type (user/project/knowledge/distilled)', value: 'knowledge' },
            { name: 'scope', label: 'Scope', value: 'global' },
            { name: 'tags', label: 'Tags (comma separated)', value: '' },
            { name: 'content', label: 'Content', value: '', multiline: true },
        ];
    }
    async save() {
        const values = this.form.getValues();
        const tags = values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        try {
            if (this.mode === 'edit' && this.memoryId) {
                const useCase = new UpdateMemoryUseCase(this.context.container.memoryRepository, this.context.container.vectorIndex, this.context.container.embeddingProvider, this.context.container.enrichmentService);
                await useCase.execute({
                    id: this.memoryId,
                    title: values.title,
                    content: values.content,
                    type: values.type,
                    scope: values.scope,
                    tags,
                });
                this.context.app.showToast('Memory updated', 'success');
            }
            else {
                const useCase = new SaveMemoryUseCase(this.context.container.memoryRepository, this.context.container.vectorIndex, this.context.container.embeddingProvider, this.context.container.enrichmentService);
                await useCase.execute({
                    title: values.title,
                    content: values.content,
                    type: values.type,
                    scope: values.scope,
                    tags,
                });
                this.context.app.showToast('Memory saved', 'success');
            }
            this.context.app.navigateTo('memories');
        }
        catch (error) {
            this.context.app.showToast(`Save failed: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
}
//# sourceMappingURL=memory_edit_screen.js.map