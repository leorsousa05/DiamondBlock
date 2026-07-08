export class InstallMcpUseCase {
    installers;
    constructor(installers) {
        this.installers = installers;
    }
    async execute(input) {
        const installers = input.target
            ? this.installers.filter((i) => i.agent === input.target)
            : this.installers;
        const results = [];
        for (const installer of installers) {
            const detected = await installer.isDetected();
            if (!detected) {
                results.push({
                    agent: installer.agent,
                    installed: false,
                    configPath: '',
                    message: `${installer.agent} not detected`,
                });
                continue;
            }
            if (input.dryRun) {
                results.push({
                    agent: installer.agent,
                    installed: false,
                    configPath: '',
                    message: `Would install for ${installer.agent}`,
                });
                continue;
            }
            const result = await installer.install(input.serverConfig);
            results.push(result);
        }
        return results;
    }
}
//# sourceMappingURL=install_mcp.js.map