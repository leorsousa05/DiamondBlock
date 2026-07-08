import type { Widgets } from 'neo-blessed';
import type { Container } from '../../container.js';
import { TuiScreen } from './tui_screen.js';
export type TuiScreenName = 'dashboard' | 'memories' | 'edit-memory' | 'search' | 'sessions' | 'settings';
export interface ModalAction {
    label: string;
    handler: () => void;
}
export interface TuiOptions {
    container: Container;
    noColor?: boolean;
}
export declare class TuiApplication {
    readonly container: Container;
    readonly screen: Widgets.Screen;
    private readonly statusBar;
    private readonly screens;
    private currentScreen;
    private history;
    private modal;
    private toastTimer;
    constructor(options: TuiOptions);
    register(name: TuiScreenName, screen: TuiScreen): void;
    navigateTo(name: TuiScreenName, params?: Record<string, unknown>): void;
    goBack(): void;
    showToast(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;
    showModal(title: string, message: string, actions: ModalAction[]): void;
    start(): Promise<void>;
    stop(): void;
    private hideModal;
    private updateStatusBar;
    private createStatusBar;
    private attachGlobalKeys;
}
//# sourceMappingURL=tui_application.d.ts.map