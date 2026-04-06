import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthManager } from './auth';
import { GistService } from './gistService';
import { SettingsManager } from './settingsManager';
import {
    checkMarketplaceHealth,
    MarketplaceExtensionTarget,
    MarketplaceHealthCheckResult
} from './prototypes/marketplaceHealthCheck';
import { runSettingsE2ETest } from './prototypes/settingsE2ETest';

const MARKETPLACE_HEALTH_BATCH_SIZE = 10;
const MARKETPLACE_HEALTH_DELAY_MS = 200;

type PrototypeCommandDependencies = {
    authManager: AuthManager;
    gistService: GistService;
    settingsManager: SettingsManager;
    outputChannel: vscode.OutputChannel;
};

export function registerPrototypeCommands(
    context: vscode.ExtensionContext,
    dependencies: PrototypeCommandDependencies
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('dsfbSettingsSync.checkExtensionHealth', async () => {
            await runCheckExtensionHealthCommand(dependencies);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dsfbSettingsSync.runSettingsE2ETest', async () => {
            await runSettingsE2ETestCommand(dependencies);
        })
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showViewReportMessage(
    kind: 'info' | 'warning' | 'error',
    message: string,
    outputChannel: vscode.OutputChannel
): void {
    const action = 'View Report';
    const notifier = kind === 'error'
        ? vscode.window.showErrorMessage
        : kind === 'warning'
            ? vscode.window.showWarningMessage
            : vscode.window.showInformationMessage;

    notifier(message, action).then(selection => {
        if (selection === action) {
            outputChannel.show(true);
        }
    });
}

function parseExtensionIds(content: string): string[] {
    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(entry => typeof entry?.id === 'string' ? entry.id.trim() : '')
            .filter((id: string) => !!id);
    } catch {
        return [];
    }
}

function detectVSCodeExecutablePath(): string {
    const baseDir = path.dirname(process.execPath);
    const executableName = path.basename(process.execPath);
    const candidates = [
        process.execPath,
        path.join(baseDir, executableName),
        path.join(baseDir, 'Code.exe'),
        path.join(baseDir, 'Code - Insiders.exe'),
        path.join(baseDir, '..', executableName),
        path.join(baseDir, '..', 'Code.exe'),
        path.join(baseDir, '..', 'Code - Insiders.exe'),
        path.join(baseDir, '..', '..', executableName),
        path.join(baseDir, '..', '..', 'Code.exe'),
        path.join(baseDir, '..', '..', 'Code - Insiders.exe')
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return process.execPath;
}

async function runCheckExtensionHealthCommand(
    dependencies: PrototypeCommandDependencies
): Promise<void> {
    try {
        const token = await dependencies.authManager.getToken();
        if (!token) {
            vscode.window.showErrorMessage('GitHub 로그인 후 다시 시도해 주세요.');
            return;
        }

        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const gistId = (config.get<string>('gistId', '') || '').trim();
        if (!gistId) {
            vscode.window.showErrorMessage('Gist ID가 설정되어 있지 않습니다.');
            return;
        }

        const gistData = await dependencies.gistService.getGist(gistId, token);
        const extensionsContent = gistData?.files?.['extensions.json']?.content;
        if (!extensionsContent) {
            throw new Error('Gist does not contain extensions.json.');
        }

        const targets = parseExtensionIds(extensionsContent)
            .map(id => {
                const [publisher, ...nameParts] = id.split('.');
                if (!publisher || nameParts.length === 0) {
                    return null;
                }

                return {
                    publisher,
                    name: nameParts.join('.')
                } satisfies MarketplaceExtensionTarget;
            })
            .filter((target): target is MarketplaceExtensionTarget => target !== null);

        if (targets.length === 0) {
            throw new Error('No marketplace extension IDs were found in extensions.json.');
        }

        const results: MarketplaceHealthCheckResult[] = [];
        for (let index = 0; index < targets.length; index += MARKETPLACE_HEALTH_BATCH_SIZE) {
            results.push(...await checkMarketplaceHealth({
                extensions: targets.slice(index, index + MARKETPLACE_HEALTH_BATCH_SIZE)
            }));

            if (index + MARKETPLACE_HEALTH_BATCH_SIZE < targets.length) {
                await sleep(MARKETPLACE_HEALTH_DELAY_MS);
            }
        }

        dependencies.outputChannel.clear();
        dependencies.outputChannel.appendLine('=== Marketplace Health Check ===');
        dependencies.outputChannel.appendLine('Extension ID | Status | HTTP | URL');
        dependencies.outputChannel.appendLine('--- | --- | --- | ---');
        for (const result of results) {
            dependencies.outputChannel.appendLine(
                `${result.extensionId} | ${result.status} | ${result.httpStatusCode} | ${result.url}`
            );
        }

        const flagged = results.filter(result => result.status === 'deprecated' || result.status === 'missing');
        if (flagged.length > 0) {
            showViewReportMessage(
                'warning',
                `마켓플레이스 헬스체크 완료: deprecated/missing 항목 ${flagged.length}개를 확인했습니다.`,
                dependencies.outputChannel
            );
            return;
        }

        vscode.window.showInformationMessage('마켓플레이스 헬스체크가 완료되었습니다.');
    } catch (err: any) {
        vscode.window.showErrorMessage(`익스텐션 헬스체크 실패: ${err.message}`);
    }
}

async function runSettingsE2ETestCommand(
    dependencies: PrototypeCommandDependencies
): Promise<void> {
    try {
        const executablePath = detectVSCodeExecutablePath();
        const result = await runSettingsE2ETest({
            vscodeExecutablePath: executablePath,
            settings: dependencies.settingsManager.getLocalSettingsObject()
        });

        if (result.errorLogMatches.length === 0) {
            vscode.window.showInformationMessage('설정 E2E 테스트 통과');
            return;
        }

        dependencies.outputChannel.clear();
        dependencies.outputChannel.appendLine('=== Settings E2E Test ===');
        dependencies.outputChannel.appendLine(`Executable: ${executablePath}`);
        dependencies.outputChannel.appendLine(`User data dir: ${result.userDataDir}`);
        dependencies.outputChannel.appendLine(`Workspace dir: ${result.workspaceDir}`);
        dependencies.outputChannel.appendLine(`Exit code: ${result.exitCode ?? 'null'}`);
        dependencies.outputChannel.appendLine('');
        dependencies.outputChannel.appendLine('[Error log matches]');
        for (const line of result.errorLogMatches) {
            dependencies.outputChannel.appendLine(line);
        }

        if (result.stderr.trim()) {
            dependencies.outputChannel.appendLine('');
            dependencies.outputChannel.appendLine('[stderr]');
            dependencies.outputChannel.appendLine(result.stderr.trim());
        }

        showViewReportMessage(
            'warning',
            `설정 E2E 테스트에서 오류 로그 ${result.errorLogMatches.length}개가 감지되었습니다.`,
            dependencies.outputChannel
        );
    } catch (err: any) {
        vscode.window.showErrorMessage(`설정 E2E 테스트 실패: ${err.message}`);
    }
}
