import blessed from 'neo-blessed';
import { TuiScreen } from '../tui_screen.js';
import { createPanel } from '../components/panel.js';
import { createForm } from '../components/form.js';
export class SettingsScreen extends TuiScreen {
    form;
    config = {};
    get name() {
        return 'settings';
    }
    async mount() {
        this.config = await this.context.container.configStore.load();
        this.render();
    }
    unmount() {
        this.clear();
    }
    render() {
        this.clear();
        createPanel({
            parent: this.root,
            title: 'Settings',
            width: '100%',
            height: '100%',
        });
        this.form = createForm({
            parent: this.root,
            fields: [
                { name: 'vaultPath', label: 'Vault Path', value: this.config.vaultPath ?? '' },
                {
                    name: 'embeddingProvider',
                    label: 'Embedding Provider (local/openai)',
                    value: this.config.embeddingProvider ?? 'local',
                },
                { name: 'openaiApiKey', label: 'OpenAI API Key', value: this.config.openaiApiKey ?? '' },
                {
                    name: 'openaiEmbeddingModel',
                    label: 'OpenAI Embedding Model',
                    value: this.config.openaiEmbeddingModel ?? '',
                },
                {
                    name: 'heartbeatIntervalMinutes',
                    label: 'Heartbeat Interval (minutes)',
                    value: String(this.config.heartbeatIntervalMinutes ?? 5),
                },
                {
                    name: 'contextWindowTokens',
                    label: 'Context Window Tokens',
                    value: String(this.config.contextWindowTokens ?? 8192),
                },
            ],
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
    async save() {
        const values = this.form.getValues();
        const config = {
            vaultPath: values.vaultPath || undefined,
            embeddingProvider: values.embeddingProvider,
            openaiApiKey: values.openaiApiKey || undefined,
            openaiEmbeddingModel: values.openaiEmbeddingModel || undefined,
            heartbeatIntervalMinutes: values.heartbeatIntervalMinutes
                ? parseInt(values.heartbeatIntervalMinutes, 10)
                : undefined,
            contextWindowTokens: values.contextWindowTokens
                ? parseInt(values.contextWindowTokens, 10)
                : undefined,
        };
        try {
            await this.context.container.configStore.save(config);
            this.context.app.showToast('Settings saved', 'success');
            this.context.app.goBack();
        }
        catch (error) {
            this.context.app.showToast(`Save failed: ${error instanceof Error ? error.message : error}`, 'error');
        }
    }
}
//# sourceMappingURL=settings_screen.js.map