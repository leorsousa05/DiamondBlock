import { InstallMcpUseCase } from '../../../application/use_cases/install_mcp.js';
import { createDefaultInstallers } from '../../../infrastructure/mcp_installers/json_file_installer.js';
export const mcpInstallRoutes = async (app, _opts) => {
    const installers = createDefaultInstallers();
    // GET /api/mcp/targets
    app.get('/api/mcp/targets', async (_req, reply) => {
        const targets = await Promise.all(installers.map(async (installer) => {
            const configPath = installer.getConfigPath?.() ?? '';
            return {
                name: installer.agent,
                label: installer.agent.charAt(0).toUpperCase() + installer.agent.slice(1),
                configPath,
                detected: await installer.isDetected(),
            };
        }));
        return reply.send(targets);
    });
    // POST /api/mcp/install
    app.post('/api/mcp/install', async (req, reply) => {
        const body = (req.body ?? {});
        const serverConfig = {
            command: typeof body.command === 'string' ? body.command : 'diamondblock',
            args: Array.isArray(body.args) ? body.args : ['mcp'],
            env: typeof body.env === 'object' && body.env !== null ? body.env : undefined,
        };
        const targets = Array.isArray(body.targets) ? body.targets : [];
        const results = [];
        const useCase = new InstallMcpUseCase(installers);
        if (targets.length > 0) {
            for (const t of targets) {
                const res = await useCase.execute({
                    serverConfig,
                    target: t,
                    dryRun: body.dryRun === true,
                });
                results.push(...res);
            }
        }
        else {
            const res = await useCase.execute({
                serverConfig,
                target: typeof body.target === 'string' ? body.target : undefined,
                dryRun: body.dryRun === true,
            });
            results.push(...res);
        }
        const installed = results
            .filter((r) => r.installed || (body.dryRun === true && r.message.startsWith('Would install')))
            .map((r) => r.agent);
        return reply.send({ installed, results });
    });
};
//# sourceMappingURL=mcp_install.routes.js.map