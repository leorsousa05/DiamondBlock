import { createDefaultContainer } from '../../container_factory.js';
import { TuiApplication } from './tui_application.js';
import { DashboardScreen } from './screens/dashboard_screen.js';
import { MemoryListScreen } from './screens/memory_list_screen.js';
import { MemoryEditScreen } from './screens/memory_edit_screen.js';
import { SearchScreen } from './screens/search_screen.js';
import { SessionsScreen } from './screens/sessions_screen.js';
import { SettingsScreen } from './screens/settings_screen.js';
export async function launchTui(options = {}) {
    const container = await createDefaultContainer(options.vaultPath);
    const app = new TuiApplication({ container, noColor: options.noColor });
    app.register('dashboard', new DashboardScreen({ app, container, screen: app.screen }));
    app.register('memories', new MemoryListScreen({ app, container, screen: app.screen }));
    app.register('edit-memory', new MemoryEditScreen({ app, container, screen: app.screen }));
    app.register('search', new SearchScreen({ app, container, screen: app.screen }));
    app.register('sessions', new SessionsScreen({ app, container, screen: app.screen }));
    app.register('settings', new SettingsScreen({ app, container, screen: app.screen }));
    await app.start();
}
export { TuiApplication } from './tui_application.js';
export { TuiScreen } from './tui_screen.js';
//# sourceMappingURL=index.js.map