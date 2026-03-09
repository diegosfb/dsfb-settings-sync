import * as vscode from 'vscode';

export class SoloboiSyncTreeProvider implements vscode.TreeDataProvider<SyncTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SyncTreeItem | undefined | void> = new vscode.EventEmitter<SyncTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<SyncTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SyncTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SyncTreeItem): Thenable<SyncTreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        const items: SyncTreeItem[] = [
            new SyncTreeItem(
                'Upload Settings',
                '현재 에디터 설정을 백업합니다.',
                vscode.TreeItemCollapsibleState.None,
                { command: 'soloboisSettingsSync.uploadNow', title: 'Upload Settings' },
                new vscode.ThemeIcon('cloud-upload')
            ),
            new SyncTreeItem(
                'Download Settings',
                '원격 설정을 다운로드하여 적용합니다.',
                vscode.TreeItemCollapsibleState.None,
                { command: 'soloboisSettingsSync.downloadNow', title: 'Download Settings' },
                new vscode.ThemeIcon('cloud-download')
            ),
            new SyncTreeItem(
                'Show Gist History',
                '이전 버전의 설정으로 복원합니다.',
                vscode.TreeItemCollapsibleState.None,
                { command: 'soloboisSettingsSync.showHistory', title: 'Show Gist History' },
                new vscode.ThemeIcon('history')
            ),
            new SyncTreeItem(
                'Set Gist ID',
                'Gist ID를 수동으로 입력합니다.',
                vscode.TreeItemCollapsibleState.None,
                { command: 'soloboisSettingsSync.setGistId', title: 'Set Gist ID' },
                new vscode.ThemeIcon('key')
            ),
            new SyncTreeItem(
                'Extension Settings',
                'Soloboi\'s Settings Sync 확장 설정을 엽니다.',
                vscode.TreeItemCollapsibleState.None,
                { command: 'workbench.action.openSettings', title: 'Open Settings', arguments: ['@ext:soloboi.solobois-settings-sync'] },
                new vscode.ThemeIcon('settings-gear')
            )
        ];

        return Promise.resolve(items);
    }
}

export class SyncTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly iconPath?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.command = command;
        this.iconPath = iconPath;
    }
}
