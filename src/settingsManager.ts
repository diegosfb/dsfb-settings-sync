import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import { sensitiveDataGuard } from './sensitiveDataGuard';

/**
 * Manages reading/writing local VS Code settings files, keybindings, and extensions.
 */
export class SettingsManager {

    /**
     * Read extension directory names marked for uninstall in `.obsolete`.
     * VS Code/Antigravity writes this file before reload completes uninstall.
     */
    private getPendingUninstallExtensionDirs(): Set<string> {
        const extensionsDir = this.getExtensionsDir();
        if (!extensionsDir) {
            return new Set();
        }

        const obsoletePath = path.join(extensionsDir, '.obsolete');
        if (!fs.existsSync(obsoletePath)) {
            return new Set();
        }

        try {
            const raw = fs.readFileSync(obsoletePath, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return new Set();
            }
            return new Set(Object.keys(parsed).map(key => key.toLowerCase()));
        } catch {
            console.warn('Soloboi\'s Settings Sync: Failed to parse .obsolete');
            return new Set();
        }
    }

    /**
     * Get ignored extension IDs from configuration (normalized lowercase).
     */
    private getIgnoredExtensionIds(): Set<string> {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const ignored = config.get<string[]>('ignoredExtensions', []);
        return new Set(
            ignored
                .map(id => (id || '').trim().toLowerCase())
                .filter(id => !!id)
        );
    }

    private installExtensionViaCLI(id: string): Promise<void> {
        const appRoot = vscode.env.appRoot;
        let cliPath: string;

        if (process.platform === 'win32') {
            cliPath = path.join(appRoot, '..', 'bin', 'code.cmd');
        } else if (process.platform === 'darwin') {
            cliPath = path.join(appRoot, '..', '..', '..', 'Contents', 'Resources', 'app', 'bin', 'code');
        } else {
            cliPath = path.join(appRoot, '..', 'bin', 'code');
        }

        if (!fs.existsSync(cliPath)) {
            cliPath = 'code';
        }

        return new Promise<void>((resolve, reject) => {
            cp.execFile(cliPath, ['--install-extension', id], err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Get the VS Code User settings directory based on the current OS.
     */
    getUserSettingsDir(): string | null {
        const isWindows = process.platform === 'win32';
        const isMac = process.platform === 'darwin';

        // Detect app folder name (default to Antigravity, fallback to Code/VSCodium if not found)
        const appName = vscode.env.appName || "";
        const appNameLower = appName.toLowerCase();
        let folderName = 'Antigravity';

        if (appNameLower.includes('antigravity')) {
            folderName = 'Antigravity';
        } else if (appNameLower.includes('vscodium')) {
            folderName = 'VSCodium';
        } else if (appNameLower.includes('code')) {
            folderName = 'Code';
        }

        if (isWindows && process.env.APPDATA) {
            return path.join(process.env.APPDATA, folderName, 'User');
        } else if (isMac && process.env.HOME) {
            return path.join(process.env.HOME, 'Library', 'Application Support', folderName, 'User');
        } else if (process.env.HOME) {
            return path.join(process.env.HOME, '.config', folderName.toLowerCase(), 'User');
        }
        return null;
    }

    /**
     * Get the path to settings.json
     */
    getSettingsPath(): string | null {
        const dir = this.getUserSettingsDir();
        return dir ? path.join(dir, 'settings.json') : null;
    }

    /**
     * Get the path to keybindings.json
     */
    getKeybindingsPath(): string | null {
        const dir = this.getUserSettingsDir();
        return dir ? path.join(dir, 'keybindings.json') : null;
    }

    // ?? Read Operations ??????????????????????????????????????????????

    /**
     * Read local settings.json content as a string.
     * Merges all installed extension settings (including defaults) so that
     * the Gist always contains every extension configuration value.
     */
    readLocalSettings(): string | null {
        const filePath = this.getSettingsPath();
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const fileObj = this.parseJsonc(content);
        if (!fileObj) {
            // JSONC parse failed — apply value-based redaction on raw content as fallback
            return sensitiveDataGuard.redactJsonString(content, 'private').result;
        }

        // Collect all extension configuration values (including defaults)
        const extSettings = this.readAllExtensionSettings();

        // Extension defaults first, then file settings override
        const merged = { ...extSettings, ...fileObj };

        // Filter out ignored keys
        const ignored = this.getIgnoredPatterns();
        if (ignored.length > 0) {
            for (const key of Object.keys(merged)) {
                if (this.shouldIgnore(key, ignored)) {
                    delete merged[key];
                }
            }
        }

        // Convert absolute paths to portable variables for cross-machine sync
        return this.portablizePaths(JSON.stringify(sensitiveDataGuard.redactObject(merged, 'private').result, null, 4));
    }

    /**
     * Read local keybindings.json content as a string.
     * Returns empty array JSON if the file doesn't exist yet.
     */
    readLocalKeybindings(): string {
        const filePath = this.getKeybindingsPath();
        if (!filePath || !fs.existsSync(filePath)) {
            return '[]';
        }
        // keybindings.json is an array, so key-based redaction is skipped here.
        // Command args may still embed secrets and should be reviewed manually before sync.
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Read local settings.json content without any processing.
     */
    readLocalSettingsRaw(): string | null {
        const filePath = this.getSettingsPath();
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Parse and return the local settings as an object.
     */
    getLocalSettingsObject(): any {
        const content = this.readLocalSettingsRaw();
        if (!content) return {};
        return this.parseJsonc(content) || {};
    }

    /**
     * Get the extensions directory for the current editor.
     * Checks ~/.antigravity/extensions/ first, then falls back to ~/.vscode/extensions/
     */
    getExtensionsDir(): string | null {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) return null;

        // Try Antigravity first, then VS Code
        const candidates = [
            path.join(homeDir, '.antigravity', 'extensions'),
            path.join(homeDir, '.vscode', 'extensions'),
        ];

        for (const dir of candidates) {
            if (fs.existsSync(dir)) {
                return dir;
            }
        }
        return null;
    }

    /**
     * Read all extension configuration values (including defaults).
     * Uses a dual approach:
     *   1) VS Code API (vscode.extensions.all)
     *   2) Disk scan of the extensions directory (fallback for Antigravity fork)
     * This ensures ALL extension settings are captured.
     */
    readAllExtensionSettings(): Record<string, any> {
        const allSettings: Record<string, any> = {};
        const processedKeys = new Set<string>();

        // ?? Approach 1: VS Code API ?????????????????????????????????
        let apiExtCount = 0;
        for (const ext of vscode.extensions.all) {
            const publisher = (ext.packageJSON?.publisher || '').toLowerCase();
            if (publisher === 'vscode') continue;

            const config = ext.packageJSON?.contributes?.configuration;
            if (!config) continue;

            apiExtCount++;
            const configs = Array.isArray(config) ? config : [config];

            for (const cfg of configs) {
                const properties = cfg.properties;
                if (!properties) continue;

                for (const key of Object.keys(properties)) {
                    if (processedKeys.has(key)) continue;
                    processedKeys.add(key);
                    const value = vscode.workspace.getConfiguration().get(key);
                    if (value !== undefined) {
                        allSettings[key] = value;
                    }
                }
            }
        }

        // ?? Approach 2: Disk scan (fallback) ????????????????????????
        let diskExtCount = 0;
        const extensionsDir = this.getExtensionsDir();
        if (extensionsDir) {
            try {
                const entries = fs.readdirSync(extensionsDir);
                for (const entry of entries) {
                    if (entry === 'extensions.json' || entry === '.obsolete') continue;

                    const pkgPath = path.join(extensionsDir, entry, 'package.json');
                    if (!fs.existsSync(pkgPath)) continue;

                    try {
                        const pkgContent = fs.readFileSync(pkgPath, 'utf8');
                        const pkg = JSON.parse(pkgContent);

                        const publisher = (pkg.publisher || '').toLowerCase();
                        if (publisher === 'vscode') continue;

                        const config = pkg.contributes?.configuration;
                        if (!config) continue;

                        diskExtCount++;
                        const configs = Array.isArray(config) ? config : [config];

                        for (const cfg of configs) {
                            const properties = cfg.properties;
                            if (!properties) continue;

                            for (const key of Object.keys(properties)) {
                                if (processedKeys.has(key)) continue;
                                processedKeys.add(key);

                                // Try VS Code API first, fall back to default from package.json
                                const apiValue = vscode.workspace.getConfiguration().get(key);
                                if (apiValue !== undefined) {
                                    allSettings[key] = apiValue;
                                } else if (properties[key].default !== undefined) {
                                    allSettings[key] = properties[key].default;
                                }
                            }
                        }
                    } catch {
                        // Skip extensions with invalid package.json
                    }
                }
            } catch (err) {
                console.warn('Soloboi\'s Settings Sync: Failed to scan extensions directory', err);
            }
        }

        console.log(`Soloboi\'s Settings Sync: Collected ${Object.keys(allSettings).length} settings (API: ${apiExtCount} exts, Disk: ${diskExtCount} exts)`);
        return allSettings;
    }

    /**
     * Build a JSON string listing all currently installed extensions.
     * Format: [{ "id": "publisher.name", "name": "...", "version": "...", "publisher": "...", "description": "..." }, ...]
     */
    readInstalledExtensions(): string {
        const pendingUninstallDirs = this.getPendingUninstallExtensionDirs();
        const ignoredIds = this.getIgnoredExtensionIds();
        const extensions = vscode.extensions.all
            .filter(ext => !ext.packageJSON?.isBuiltin) // skip built-in extensions
            .filter(ext => !ignoredIds.has(ext.id.toLowerCase()))
            .filter(ext => {
                const dirName = path.basename(ext.extensionPath || '').toLowerCase();
                return !dirName || !pendingUninstallDirs.has(dirName);
            })
            .map(ext => ({
                id: ext.id,
                name: ext.packageJSON?.displayName || ext.packageJSON?.name || '',
                version: ext.packageJSON?.version || '',
                publisher: ext.packageJSON?.publisher || '',
                description: ext.packageJSON?.description || ''
            }));

        return JSON.stringify(extensions, null, 2);
    }

    /**
     * Get the Antigravity data directory (~/.gemini/antigravity/)
     */
    getAntigravityDataDir(): string | null {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) return null;
        return path.join(homeDir, '.gemini', 'antigravity');
    }

    /**
     * Get the path to Antigravity internal settings (mcp_config.json)
     */
    getAntigravityConfigPath(): string | null {
        const dir = this.getAntigravityDataDir();
        return dir ? path.join(dir, 'mcp_config.json') : null;
    }

    /**
     * Get the path to browserAllowlist.txt
     */
    getBrowserAllowlistPath(): string | null {
        const dir = this.getAntigravityDataDir();
        return dir ? path.join(dir, 'browserAllowlist.txt') : null;
    }

    /**
     * Get the snippets directory path
     */
    getSnippetsDir(): string | null {
        const dir = this.getUserSettingsDir();
        return dir ? path.join(dir, 'snippets') : null;
    }

    /**
     * Get the backup directory
     */
    getBackupDir(): string | null {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) return null;
        return path.join(homeDir, '.antigravity-sync-backup');
    }

    /**
     * Read local Antigravity config (mcp_config.json).
     */
    readAntigravityConfig(): string | null {
        const filePath = this.getAntigravityConfigPath();
        return this.readRedactedJsonFile(filePath);
    }

    /**
     * Read browserAllowlist.txt content.
     */
    readBrowserAllowlist(): string | null {
        const filePath = this.getBrowserAllowlistPath();
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Read all snippet files from the snippets directory.
     * Returns a JSON string: { "filename": "content", ... }
     */
    readSnippets(): string | null {
        const snippetsDir = this.getSnippetsDir();
        if (!snippetsDir || !fs.existsSync(snippetsDir)) {
            return null;
        }

        const snippetFiles: Record<string, string> = {};
        const entries = fs.readdirSync(snippetsDir);

        for (const entry of entries) {
            const ext = path.extname(entry).toLowerCase();
            if (ext === '.json' || ext === '.code-snippets') {
                const filePath = path.join(snippetsDir, entry);
                if (fs.statSync(filePath).isFile()) {
                    snippetFiles[entry] = fs.readFileSync(filePath, 'utf8');
                }
            }
        }

        if (Object.keys(snippetFiles).length === 0) {
            return null;
        }
        return JSON.stringify(snippetFiles, null, 2);
    }

    /**
     * Locate storage.json that contains UI state such as status bar visibility.
     * Returns null when no storage.json exists (e.g. when state is stored in state.vscdb).
     */
    getStatusBarStoragePath(requireExisting: boolean = true): string | null {
        const userSettingsDir = this.getUserSettingsDir();
        if (!userSettingsDir) {
            return null;
        }

        const candidates = [
            path.join(userSettingsDir, 'globalStorage', 'storage.json'),
            path.join(userSettingsDir, 'storage.json')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return requireExisting ? null : candidates[0];
    }

    /**
     * Locate state.vscdb that contains UI state such as status bar visibility.
     */
    getStatusBarStateDbPath(requireExisting: boolean = true): string | null {
        const userSettingsDir = this.getUserSettingsDir();
        if (!userSettingsDir) {
            return null;
        }

        const candidates = [
            path.join(userSettingsDir, 'globalStorage', 'state.vscdb'),
            path.join(userSettingsDir, 'state.vscdb')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return requireExisting ? null : candidates[0];
    }

    /**
     * Get the active status bar state source path (storage.json or state.vscdb).
     */
    getStatusBarStateSourcePath(requireExisting: boolean = true): { path: string; source: 'storage.json' | 'state.vscdb' } | null {
        const storagePath = this.getStatusBarStoragePath(requireExisting);
        if (storagePath && (!requireExisting || fs.existsSync(storagePath))) {
            return { path: storagePath, source: 'storage.json' };
        }

        const dbPath = this.getStatusBarStateDbPath(requireExisting);
        if (dbPath && (!requireExisting || fs.existsSync(dbPath))) {
            return { path: dbPath, source: 'state.vscdb' };
        }

        return null;
    }

    /**
     * Read status bar-related UI state from storage.json or state.vscdb.
     * Only keys containing "statusbar" are captured.
     */
    readStatusBarState(): string | null {
        const storagePath = this.getStatusBarStoragePath(true);
        let stateObj = storagePath ? this.readStatusBarStateFromStorage(storagePath) : null;

        if (!stateObj) {
            const dbPath = this.getStatusBarStateDbPath(true);
            stateObj = dbPath ? this.readStatusBarStateFromStateDb(dbPath) : null;
        }

        const manualItems = this.getStatusBarItemsFromConfig();
        if (manualItems.length > 0) {
            stateObj = stateObj ?? {};
            stateObj['dsfbSettingsSync.statusBarItems'] = manualItems;
        }

        if (stateObj) {
            const visibleResult = this.computeVisibleStatusBarItems(stateObj, manualItems);
            if (visibleResult.shouldInclude) {
                stateObj['dsfbSettingsSync.statusBarVisibleItems'] = visibleResult.items;
            }
        }

        if (!stateObj || Object.keys(stateObj).length === 0) {
            return null;
        }

        return JSON.stringify(stateObj, null, 2);
    }

    private readStatusBarStateFromStorage(storagePath: string): Record<string, any> | null {
        const content = fs.readFileSync(storagePath, 'utf8');
        const parsed = this.parseJsonc(content);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }

        const entries: Record<string, any> = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (this.isStatusBarStateKey(key) && !this.isStatusBarMetaKey(key)) {
                entries[key] = value;
            }
        }

        if (Object.keys(entries).length === 0) {
            return null;
        }

        return entries;
    }

    private readStatusBarStateFromStateDb(dbPath: string): Record<string, any> | null {
        const rows = this.queryStateDb(dbPath, "SELECT key, value FROM ItemTable WHERE key LIKE '%statusbar%' COLLATE NOCASE");
        if (!rows || rows.length === 0) {
            return null;
        }

        const entries: Record<string, any> = {};
        for (const row of rows) {
            const key = String(row.key ?? '');
            if (!key) {
                continue;
            }
            if (this.isStatusBarMetaKey(key)) {
                continue;
            }
            const rawValue = typeof row.value === 'string' ? row.value : String(row.value ?? '');
            entries[key] = this.safeParseJson(rawValue);
        }

        if (Object.keys(entries).length === 0) {
            return null;
        }

        return entries;
    }

    /**
     * Apply status bar-related UI state into storage.json or state.vscdb (best-effort).
     * Only keys containing "statusbar" are written.
     */
    writeStatusBarState(remoteContent: string): { applied: boolean; message?: string } {
        const storagePath = this.getStatusBarStoragePath(true);
        if (storagePath) {
            return this.writeStatusBarStateToStorage(storagePath, remoteContent);
        }

        const dbPath = this.getStatusBarStateDbPath(true);
        if (dbPath) {
            return this.writeStatusBarStateToStateDb(dbPath, remoteContent);
        }

        return { applied: false, message: 'storage.json or state.vscdb not found' };
    }

    private writeStatusBarStateToStorage(storagePath: string, remoteContent: string): { applied: boolean; message?: string } {
        const remoteObj = this.parseJsonc(remoteContent);
        if (!remoteObj || typeof remoteObj !== 'object' || Array.isArray(remoteObj)) {
            return { applied: false, message: 'Invalid status bar data' };
        }
        this.applyVisibleStatusBarItems(remoteObj as Record<string, any>);

        let localObj: Record<string, any> = {};
        try {
            const localRaw = fs.readFileSync(storagePath, 'utf8');
            const parsedLocal = this.parseJsonc(localRaw);
            if (parsedLocal && typeof parsedLocal === 'object' && !Array.isArray(parsedLocal)) {
                localObj = parsedLocal as Record<string, any>;
            }
        } catch {
            // fallback to empty object
        }

        const appliedCount = this.applyStatusBarEntries(localObj, remoteObj);
        if (appliedCount === 0) {
            return { applied: false, message: 'No status bar keys to apply' };
        }

        this.writeFileIfChanged(storagePath, JSON.stringify(localObj, null, 2));
        return { applied: true };
    }

    private writeStatusBarStateToStateDb(dbPath: string, remoteContent: string): { applied: boolean; message?: string } {
        const remoteObj = this.parseJsonc(remoteContent);
        if (!remoteObj || typeof remoteObj !== 'object' || Array.isArray(remoteObj)) {
            return { applied: false, message: 'Invalid status bar data' };
        }
        this.applyVisibleStatusBarItems(remoteObj as Record<string, any>);

        const entries = Object.entries(remoteObj).filter(([key]) => this.isWritableStatusBarKey(key));
        if (entries.length === 0) {
            return { applied: false, message: 'No status bar keys to apply' };
        }

        const statements: string[] = ['BEGIN;'];
        for (const [key, value] of entries) {
            const valueJson = JSON.stringify(value);
            statements.push(
                `INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('${this.escapeSqlite(key)}', '${this.escapeSqlite(valueJson)}');`
            );
        }
        statements.push('COMMIT;');

        const result = cp.spawnSync('sqlite3', [dbPath, statements.join('\n')], { encoding: 'utf8' });
        if (result.error || result.status !== 0) {
            return { applied: false, message: 'Failed to write status bar state to state.vscdb' };
        }

        return { applied: true };
    }

    private applyStatusBarEntries(target: Record<string, any>, source: Record<string, any>): number {
        let appliedCount = 0;
        for (const [key, value] of Object.entries(source)) {
            if (!this.isWritableStatusBarKey(key)) {
                continue;
            }
            target[key] = value;
            appliedCount++;
        }
        return appliedCount;
    }

    private applyVisibleStatusBarItems(remoteObj: Record<string, any>): void {
        const visibleRaw = remoteObj['dsfbSettingsSync.statusBarVisibleItems'];
        if (!Array.isArray(visibleRaw)) {
            return;
        }
        const visibleItems = visibleRaw
            .map(item => this.normalizeStatusBarItemId(item))
            .filter((item): item is string => !!item);
        if (visibleItems.length === 0) {
            return;
        }

        const localStateRaw = this.readStatusBarState();
        if (!localStateRaw) {
            return;
        }
        const localStateObj = this.parseJsonc(localStateRaw);
        if (!localStateObj || typeof localStateObj !== 'object' || Array.isArray(localStateObj)) {
            return;
        }

        const localManualItems = this.getStatusBarItemsFromConfig();
        const knownItems = this.collectStatusBarItemIds(localStateObj as Record<string, any>, localManualItems);
        if (knownItems.length === 0) {
            return;
        }

        const visibleSet = new Set(visibleItems.map(item => item.toLowerCase()));
        const hiddenItems = knownItems.filter(item => !visibleSet.has(item.toLowerCase()));

        let hiddenKey = Object.keys(remoteObj).find(key => {
            const lower = key.toLowerCase();
            return lower.includes('statusbar')
                && lower.includes('hidden')
                && Array.isArray((remoteObj as Record<string, any>)[key]);
        });

        if (!hiddenKey) {
            hiddenKey = 'workbench.statusbar.hidden';
        }

        remoteObj[hiddenKey] = hiddenItems;
    }

    private getStatusBarItemsFromConfig(): string[] {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const raw = config.get<string[]>('statusBarItems', []);
        return raw.map(item => (item || '').trim()).filter(item => !!item);
    }

    private isStatusBarStateKey(key: string): boolean {
        return key.toLowerCase().includes('statusbar');
    }

    private isStatusBarMetaKey(key: string): boolean {
        return key === 'dsfbSettingsSync.statusBarItems'
            || key === 'dsfbSettingsSync.statusBarVisibleItems';
    }

    private isWritableStatusBarKey(key: string): boolean {
        if (!this.isStatusBarStateKey(key)) {
            return false;
        }
        if (this.isStatusBarMetaKey(key)) {
            return false;
        }
        if (key.toLowerCase().startsWith('dsfbsettingssync.')) {
            return false;
        }
        return true;
    }

    private safeParseJson(raw: string): any {
        const trimmed = raw.trim();
        if (!trimmed) {
            return raw;
        }
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if (trimmed === 'null') return null;
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return Number(trimmed);
        }
        if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return raw;
            }
        }
        return raw;
    }

    private computeVisibleStatusBarItems(stateObj: Record<string, any>, manualItems: string[]): { items: string[]; shouldInclude: boolean } {
        const hiddenItems = this.extractHiddenStatusBarItems(stateObj);
        const knownItems = this.collectStatusBarItemIds(stateObj, manualItems);
        const shouldInclude = hiddenItems.length > 0 || knownItems.length > 0 || manualItems.length > 0;
        if (knownItems.length === 0) {
            return { items: [], shouldInclude };
        }
        const hiddenSet = new Set(hiddenItems.map(item => item.toLowerCase()));
        const visible: string[] = [];
        for (const item of knownItems) {
            if (!hiddenSet.has(item.toLowerCase())) {
                visible.push(item);
            }
        }
        return { items: Array.from(new Set(visible)), shouldInclude };
    }

    private extractHiddenStatusBarItems(stateObj: Record<string, any>): string[] {
        const hidden: string[] = [];
        for (const [key, value] of Object.entries(stateObj)) {
            const lower = key.toLowerCase();
            if (!lower.includes('statusbar') || !lower.includes('hidden')) {
                continue;
            }
            if (Array.isArray(value)) {
                for (const item of value) {
                    const normalized = this.normalizeStatusBarItemId(item);
                    if (normalized) {
                        hidden.push(normalized);
                    }
                }
            }
        }
        return Array.from(new Set(hidden));
    }

    private collectStatusBarItemIds(stateObj: Record<string, any>, manualItems: string[]): string[] {
        const items = new Set<string>();
        for (const item of manualItems) {
            const normalized = this.normalizeStatusBarItemId(item);
            if (normalized) {
                items.add(normalized);
            }
        }

        for (const [key, value] of Object.entries(stateObj)) {
            if (!key.toLowerCase().includes('statusbar')) {
                continue;
            }

            if (Array.isArray(value)) {
                for (const entry of value) {
                    const normalized = this.normalizeStatusBarItemId(entry);
                    if (normalized) {
                        items.add(normalized);
                    }
                }
                continue;
            }

            if (!value || typeof value !== 'object') {
                continue;
            }

            const objValue = value as Record<string, any>;

            if (Array.isArray(objValue.items)) {
                for (const entry of objValue.items) {
                    const normalized = this.normalizeStatusBarItemId(entry?.id ?? entry?.identifier ?? entry);
                    if (normalized) {
                        items.add(normalized);
                    }
                }
            }

            if (Array.isArray(objValue.entries)) {
                for (const entry of objValue.entries) {
                    const normalized = this.normalizeStatusBarItemId(entry?.id ?? entry?.identifier ?? entry);
                    if (normalized) {
                        items.add(normalized);
                    }
                }
            }

            for (const mapKey of Object.keys(objValue)) {
                if (!this.looksLikeStatusBarItemId(mapKey)) {
                    continue;
                }
                const normalized = this.normalizeStatusBarItemId(mapKey);
                if (normalized) {
                    items.add(normalized);
                }
            }
        }

        return Array.from(items);
    }

    private looksLikeStatusBarItemId(value: string): boolean {
        const raw = String(value || '').trim();
        if (!raw || raw.length < 3) {
            return false;
        }
        const lower = raw.toLowerCase();
        if (lower.includes('statusbar') || lower.includes('workbench')) {
            return false;
        }
        if (lower.startsWith('dsfbsettingssync.')) {
            return false;
        }
        if (/\s/.test(raw)) {
            return false;
        }
        return raw.includes('.') || raw.includes(':') || raw.includes('-') || raw.includes('_');
    }

    private normalizeStatusBarItemId(value: any): string | null {
        const raw = String(value ?? '').trim();
        if (!raw) {
            return null;
        }
        const lower = raw.toLowerCase();
        if (lower.includes('statusbar.')) {
            return null;
        }
        if (lower.startsWith('dsfbsettingssync.')) {
            return null;
        }
        if (/\s/.test(raw)) {
            return null;
        }
        return raw;
    }

    private escapeSqlite(value: string): string {
        return String(value).replace(/'/g, "''");
    }

    private queryStateDb(dbPath: string, sql: string): Array<{ key: string; value: string }> | null {
        const jsonRows = this.queryStateDbJson(dbPath, sql);
        if (jsonRows) {
            return jsonRows;
        }

        const csvRows = this.queryStateDbCsv(dbPath, sql);
        if (csvRows) {
            return csvRows;
        }

        return null;
    }

    private queryStateDbJson(dbPath: string, sql: string): Array<{ key: string; value: string }> | null {
        const result = cp.spawnSync('sqlite3', ['-readonly', '-json', dbPath, sql], { encoding: 'utf8' });
        if (result.error || result.status !== 0) {
            return null;
        }
        const raw = String(result.stdout || '').trim();
        if (!raw) {
            return [];
        }
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed as Array<{ key: string; value: string }>;
            }
            return null;
        } catch {
            return null;
        }
    }

    private queryStateDbCsv(dbPath: string, sql: string): Array<{ key: string; value: string }> | null {
        const result = cp.spawnSync('sqlite3', ['-readonly', '-csv', '-header', dbPath, sql], { encoding: 'utf8' });
        if (result.error || result.status !== 0) {
            return null;
        }
        const raw = String(result.stdout || '').trim();
        if (!raw) {
            return [];
        }

        const rows = this.parseCsv(raw);
        if (rows.length === 0) {
            return [];
        }

        const header = rows[0].map(col => col.trim().toLowerCase());
        const keyIndex = header.indexOf('key');
        const valueIndex = header.indexOf('value');
        if (keyIndex === -1 || valueIndex === -1) {
            return null;
        }

        const data: Array<{ key: string; value: string }> = [];
        for (const row of rows.slice(1)) {
            const key = row[keyIndex];
            if (!key) {
                continue;
            }
            data.push({ key, value: row[valueIndex] ?? '' });
        }
        return data;
    }

    private parseCsv(content: string): string[][] {
        const rows: string[][] = [];
        let row: string[] = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (inQuotes) {
                if (char === '"') {
                    if (content[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
                continue;
            }

            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            } else if (char === '\r') {
                // ignore
            } else {
                field += char;
            }
        }

        if (field.length > 0 || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows;
    }

    // ?? Write Operations ?????????????????????????????????????????????

    /**
     * Backup current settings before download.
     */
    backupCurrentSettings(): void {
        const backupDir = this.getBackupDir();
        if (!backupDir) return;

        const date = new Date();
        const folderName = date.toISOString().replace(/[:.]/g, '-');
        const currentBackupDir = path.join(backupDir, folderName);

        this.ensureDir(currentBackupDir);

        // Copy settings.json
        const settingsPath = this.getSettingsPath();
        if (settingsPath && fs.existsSync(settingsPath)) {
            fs.copyFileSync(settingsPath, path.join(currentBackupDir, 'settings.json'));
        }

        // Copy keybindings.json
        const keybindingsPath = this.getKeybindingsPath();
        if (keybindingsPath && fs.existsSync(keybindingsPath)) {
            fs.copyFileSync(keybindingsPath, path.join(currentBackupDir, 'keybindings.json'));
        }

        // Copy mcp_config.json
        const mcpPath = this.getAntigravityConfigPath();
        if (mcpPath && fs.existsSync(mcpPath)) {
            fs.copyFileSync(mcpPath, path.join(currentBackupDir, 'mcp_config.json'));
        }

        // Copy browserAllowlist.txt
        const allowlistPath = this.getBrowserAllowlistPath();
        if (allowlistPath && fs.existsSync(allowlistPath)) {
            fs.copyFileSync(allowlistPath, path.join(currentBackupDir, 'browserAllowlist.txt'));
        }

        // Copy status bar UI state (storage.json or state.vscdb), if present
        const statusBarStoragePath = this.getStatusBarStoragePath(true);
        if (statusBarStoragePath && fs.existsSync(statusBarStoragePath)) {
            fs.copyFileSync(statusBarStoragePath, path.join(currentBackupDir, 'statusbar.storage.json'));
        } else {
            const statusBarDbPath = this.getStatusBarStateDbPath(true);
            if (statusBarDbPath && fs.existsSync(statusBarDbPath)) {
                fs.copyFileSync(statusBarDbPath, path.join(currentBackupDir, 'statusbar.state.vscdb'));
            }
        }

        // Copy snippets
        const snippetsDir = this.getSnippetsDir();
        if (snippetsDir && fs.existsSync(snippetsDir)) {
            const backupSnippetsDir = path.join(currentBackupDir, 'snippets');
            this.ensureDir(backupSnippetsDir);
            const entries = fs.readdirSync(snippetsDir);
            for (const entry of entries) {
                const ext = path.extname(entry).toLowerCase();
                if (ext === '.json' || ext === '.code-snippets') {
                    fs.copyFileSync(path.join(snippetsDir, entry), path.join(backupSnippetsDir, entry));
                }
            }
        }

        this.cleanOldBackups(backupDir);
    }

    /**
     * Keep only the 5 most recent backups.
     */
    private cleanOldBackups(backupDir: string): void {
        const MAX_BACKUPS = 5;
        if (!fs.existsSync(backupDir)) return;

        const entries = fs.readdirSync(backupDir)
            .map(name => ({ name, time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
            .sort((a, b) => b.time - a.time);

        if (entries.length > MAX_BACKUPS) {
            for (let i = MAX_BACKUPS; i < entries.length; i++) {
                const dirToRemove = path.join(backupDir, entries[i].name);
                fs.rmSync(dirToRemove, { recursive: true, force: true });
            }
        }
    }

    /**
     * Write content to settings.json (deep-merge with existing settings).
     */
    writeLocalSettings(remoteContent: string): void {
        const filePath = this.getSettingsPath();
        if (!filePath) {
            throw new Error('Cannot determine settings.json path');
        }

        // Resolve portable path variables to local machine paths
        const resolvedContent = this.resolvePortablePaths(remoteContent);

        const remoteObj = this.parseJsonc(resolvedContent);
        if (!remoteObj) {
            throw new Error('Cannot parse remote settings.json');
        }

        const ignored = this.getIgnoredPatterns();
        if (ignored.length > 0) {
            for (const key of Object.keys(remoteObj)) {
                if (this.shouldIgnore(key, ignored)) {
                    delete remoteObj[key];
                }
            }
        }

        let localObj: any = {};
        if (fs.existsSync(filePath)) {
            const localContent = fs.readFileSync(filePath, 'utf8');
            localObj = this.parseJsonc(localContent) ?? {};
        }

        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const authoritativeDownload = config.get<boolean>('authoritativeDownload', false);
        const nextSettings = authoritativeDownload
            ? this.preserveIgnoredLocalSettings(localObj, remoteObj, ignored)
            : this.deepMerge(localObj, remoteObj);

        this.writeFileIfChanged(filePath, JSON.stringify(nextSettings, null, 4));
    }

    /**
     * Write content to keybindings.json (full overwrite).
     */
    writeLocalKeybindings(content: string): void {
        const filePath = this.getKeybindingsPath();
        if (!filePath) {
            throw new Error('Cannot determine keybindings.json path');
        }
        this.writeFileIfChanged(filePath, content);
    }

    /**
     * Write content to Antigravity config (mcp_config.json).
     * Overwrites the whole file right now.
     */
    writeAntigravityConfig(content: string): void {
        const filePath = this.getAntigravityConfigPath();
        if (!filePath) {
            console.warn('Soloboi\'s Settings Sync: Cannot determine mcp_config.json path');
            return;
        }
        this.writeFileIfChanged(filePath, content);
    }

    /**
     * Write browserAllowlist.txt content.
     */
    writeBrowserAllowlist(content: string): void {
        const filePath = this.getBrowserAllowlistPath();
        if (!filePath) {
            console.warn('Soloboi\'s Settings Sync: Cannot determine browserAllowlist.txt path');
            return;
        }
        this.writeFileIfChanged(filePath, content);
    }

    /**
     * Write snippet files from remote data.
     * Expects a JSON string: { "filename": "content", ... }
     */
    writeSnippets(remoteSnippetsJson: string): void {
        const snippetsDir = this.getSnippetsDir();
        if (!snippetsDir) {
            console.warn('Soloboi\'s Settings Sync: Cannot determine snippets directory path');
            return;
        }

        let snippetFiles: Record<string, string>;
        try {
            snippetFiles = JSON.parse(remoteSnippetsJson);
        } catch {
            console.warn('Soloboi\'s Settings Sync: Cannot parse remote snippets.json');
            return;
        }

        this.ensureDir(snippetsDir);
        const resolvedSnippetsDir = path.resolve(snippetsDir);
        const snippetsDirPrefix = this.normalizePathForComparison(
            resolvedSnippetsDir.endsWith(path.sep) ? resolvedSnippetsDir : `${resolvedSnippetsDir}${path.sep}`
        );
        const remoteSnippetNames = new Set<string>();

        for (const [filename, content] of Object.entries(snippetFiles)) {
            const resolvedFilePath = this.resolveSnippetFilePath(snippetsDir, snippetsDirPrefix, filename);
            if (!resolvedFilePath) {
                continue;
            }

            remoteSnippetNames.add(path.basename(resolvedFilePath));
            this.writeFileIfChanged(resolvedFilePath, content);
        }

        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        if (!config.get<boolean>('authoritativeDownload', false)) {
            return;
        }

        const entries = fs.readdirSync(snippetsDir);
        for (const entry of entries) {
            const resolvedFilePath = this.resolveSnippetFilePath(snippetsDir, snippetsDirPrefix, entry);
            if (!resolvedFilePath || remoteSnippetNames.has(path.basename(resolvedFilePath))) {
                continue;
            }

            if (!fs.existsSync(resolvedFilePath) || !fs.statSync(resolvedFilePath).isFile()) {
                continue;
            }

            fs.unlinkSync(resolvedFilePath);
        }
    }

    /**
     * Install extensions that are in the remote list but not installed locally.
     * Returns the count of newly installed extensions.
     */
    async installMissingExtensions(remoteExtensionsJson: string): Promise<number> {
        let remoteList: { id: string }[];
        try {
            remoteList = JSON.parse(remoteExtensionsJson);
        } catch {
            console.warn('Soloboi\'s Settings Sync: Cannot parse remote extensions.json');
            return 0;
        }

        const ignoredIds = this.getIgnoredExtensionIds();
        const installed = new Set(
            vscode.extensions.all.map(ext => ext.id.toLowerCase())
        );

        let count = 0;
        for (const ext of remoteList) {
            const id = (ext.id || '').toLowerCase();
            if (id && !ignoredIds.has(id) && !installed.has(id)) {
                try {
                    await this.installExtensionViaCLI(ext.id);
                    count++;
                    console.log(`Soloboi\'s Settings Sync: Installed extension ${ext.id}`);
                } catch (err) {
                    console.error(`Soloboi\'s Settings Sync: Failed to install ${ext.id}`, err);
                }
            }
        }
        return count;
    }

    /**
     * Uninstall local extensions that are not in the remote list.
     * Returns the count of removed extensions.
     */
    async uninstallExtraExtensions(remoteExtensionsJson: string): Promise<number> {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        if (!config.get<boolean>('removeExtensions', false)) {
            return 0;
        }

        let remoteList: { id: string }[];
        try {
            remoteList = JSON.parse(remoteExtensionsJson);
        } catch {
            return 0;
        }

        const ignoredIds = this.getIgnoredExtensionIds();
        const remoteIds = new Set(remoteList.map(ext => ext.id.toLowerCase()));
        let count = 0;

        for (const ext of vscode.extensions.all) {
            if (ext.packageJSON?.isBuiltin) continue;

            const id = ext.id.toLowerCase();
            // Do not uninstall ourselves
            if (id === 'diegosfb.dsfb-settings-sync') continue;
            // Ignore list means "do not manage"
            if (ignoredIds.has(id)) continue;

            if (!remoteIds.has(id)) {
                try {
                    await vscode.commands.executeCommand(
                        'workbench.extensions.uninstallExtension',
                        ext.id
                    );
                    count++;
                    console.log(`Soloboi\'s Settings Sync: Uninstalled extra extension ${ext.id}`);
                } catch (err) {
                    console.error(`Soloboi\'s Settings Sync: Failed to uninstall ${ext.id}`, err);
                }
            }
        }
        return count;
    }

    // ?? Portable Path System ?????????????????????????????????????????

    /**
     * Build a list of path variable mappings for the current machine.
     * Ordered from MOST SPECIFIC to LEAST SPECIFIC to prevent partial matches.
     */
    private getPathVariables(): Array<{ variable: string; value: string }> {
        const vars: Array<{ variable: string; value: string }> = [];
        const userSettingsDir = this.getUserSettingsDir();
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';

        // 1. globalStorage (most specific)
        if (userSettingsDir) {
            const globalStorageDir = path.join(userSettingsDir, 'globalStorage');
            vars.push({ variable: '${globalStorage}', value: globalStorageDir });
        }

        // 2. User settings dir (e.g., %APPDATA%/Antigravity/User)
        if (userSettingsDir) {
            vars.push({ variable: '${userSettingsDir}', value: userSettingsDir });
        }

        // 3. AppData / Application Support
        if (process.platform === 'win32' && process.env.APPDATA) {
            vars.push({ variable: '${appData}', value: process.env.APPDATA });
        } else if (process.platform === 'darwin' && process.env.HOME) {
            vars.push({ variable: '${appData}', value: path.join(process.env.HOME, 'Library', 'Application Support') });
        } else if (process.env.HOME) {
            vars.push({ variable: '${appData}', value: path.join(process.env.HOME, '.config') });
        }

        // 4. User home (least specific)
        if (homeDir) {
            vars.push({ variable: '${userHome}', value: homeDir });
        }

        return vars;
    }

    /**
     * Replace machine-specific absolute paths with portable ${variables}.
     * Used during UPLOAD to make settings.json cross-machine compatible.
     *
     * JSON.stringify produces different escape levels:
     *   - Raw path value "C:\Users" in an object becomes "C:\\Users" in JSON output
     *   - Settings values that already contain "C:\\Users" become "C:\\\\Users" in JSON output
     * We must handle all these variants, replacing the longest (most-escaped) first.
     */
    portablizePaths(settingsStr: string): string {
        const vars = this.getPathVariables();
        let result = settingsStr;

        for (const { variable, value } of vars) {
            if (!value) continue;

            // Quad-escaped: settings.json stores "C:\\Users", JSON.stringify makes "C:\\\\Users"
            const quadEscaped = value.replace(/\\/g, '\\\\\\\\');
            // Double-escaped: raw path "C:\Users" ??JSON.stringify ??"C:\\Users"
            const doubleEscaped = value.replace(/\\/g, '\\\\');
            // Forward-slash variant
            const forwardSlash = value.replace(/\\/g, '/');

            // Replace from most-escaped to least-escaped (order matters!)
            result = result.split(quadEscaped).join(variable);
            result = result.split(doubleEscaped).join(variable);
            if (forwardSlash !== value) {
                result = result.split(forwardSlash).join(variable);
            }
            result = result.split(value).join(variable);
        }

        return result;
    }

    /**
     * Resolve portable ${variables} back to local machine paths.
     * Used during DOWNLOAD to restore machine-specific paths.
     *
     * Since portablizePaths replaces quad-escaped paths with ${variable},
     * we must restore ${variable} back to quad-escaped paths to maintain
     * valid JSON with correctly escaped backslash strings.
     */
    resolvePortablePaths(settingsStr: string): string {
        const vars = this.getPathVariables();
        let result = settingsStr;

        // Resolve in REVERSE order (least specific first) to avoid
        // replacing ${userHome} inside ${globalStorage}'s expanded path
        for (const { variable, value } of [...vars].reverse()) {
            if (!value) continue;

            // Restore to double-escaped form (standard JSON for paths like "C:\\Users")
            const doubleEscaped = value.replace(/\\/g, '\\\\');
            result = result.split(variable).join(doubleEscaped);
        }

        return result;
    }

    // ?? Utilities ????????????????????????????????????????????????????

    /**
     * Get ignored patterns from configuration.
     */
    private getIgnoredPatterns(): string[] {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        return config.get<string[]>('ignoredSettings', []);
    }

    private readRedactedJsonFile(filePath: string | null): string | null {
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = this.parseJsonc(content);
        if (parsed === null) {
            return content;
        }

        return JSON.stringify(sensitiveDataGuard.redactObject(parsed, 'private').result, null, 4);
    }

    /**
     * Aggressively sanitize JSON for use in Public Gists.
     * Removes common secret-like keys (tokens, cookies, auth, private keys, etc.) recursively.
     */
    sanitizeJsonForPublicGist(jsonText: string): string {
        return sensitiveDataGuard.redactJsonString(jsonText, 'public').result;
    }

    /**
     * Preserve ignored local keys when authoritative download mode is enabled.
     */
    private preserveIgnoredLocalSettings(localObj: any, remoteObj: any, ignoredPatterns: string[]): any {
        if (ignoredPatterns.length === 0 || !localObj || typeof localObj !== 'object' || Array.isArray(localObj)) {
            return remoteObj;
        }

        const preserved = { ...remoteObj };
        for (const [key, value] of Object.entries(localObj)) {
            if (this.shouldIgnore(key, ignoredPatterns)) {
                preserved[key] = value;
            }
        }

        return preserved;
    }

    /**
     * Check if a setting key matches any ignored pattern.
     */
    private shouldIgnore(key: string, ignoredPatterns: string[]): boolean {
        const matchGlob = (pattern: string, text: string) => {
            const regexStr = '^' + pattern.split('*').map(p => p.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')).join('.*') + '$';
            return new RegExp(regexStr).test(text);
        };
        return ignoredPatterns.some(pattern => matchGlob(pattern, key));
    }

    /**
     * Parse JSONC (JSON with comments and trailing commas) by stripping them first.
     */
    private parseJsonc(content: string): any | null {
        try {
            // A more robust but simple comment remover that respects strings (to avoid breaking URLs)
            let isInsideString = false;
            let isInsideSingleLineComment = false;
            let isInsideMultiLineComment = false;
            let cleaned = '';

            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                const nextChar = content[i + 1];

                if (isInsideSingleLineComment) {
                    if (char === '\n') {
                        isInsideSingleLineComment = false;
                        cleaned += char;
                    }
                    continue;
                }

                if (isInsideMultiLineComment) {
                    if (char === '*' && nextChar === '/') {
                        isInsideMultiLineComment = false;
                        i++; // skip /
                    }
                    continue;
                }

                if (isInsideString) {
                    cleaned += char;
                    if (char === '"' && content[i - 1] !== '\\') {
                        isInsideString = false;
                    }
                    continue;
                }

                if (char === '"') {
                    isInsideString = true;
                    cleaned += char;
                    continue;
                }

                if (char === '/' && nextChar === '/') {
                    isInsideSingleLineComment = true;
                    i++;
                    continue;
                }

                if (char === '/' && nextChar === '*') {
                    isInsideMultiLineComment = true;
                    i++;
                    continue;
                }

                cleaned += char;
            }

            // Strip trailing commas before } or ]
            cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
            const trimmed = cleaned.trim();
            if (!trimmed) { return {}; }
            return JSON.parse(trimmed);
        } catch (err: any) {
            console.error('Antigravity Sync: JSONC Parse Error', err);
            return null;
        }
    }

    /**
     * Deep merge: source values override target, nested objects are merged recursively.
     */
    private deepMerge(target: any, source: any): any {
        const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

        if (!isObj(target) || !isObj(source)) {
            return source;
        }

        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (isObj(result[key]) && isObj(source[key])) {
                result[key] = this.deepMerge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    /**
     * Ensure a directory exists (recursive mkdir).
     */
    private ensureDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Write a file only when the content actually changed.
     */
    private writeFileIfChanged(filePath: string, content: string): void {
        if (fs.existsSync(filePath)) {
            const currentContent = fs.readFileSync(filePath, 'utf8');
            if (currentContent === content) {
                return;
            }
        }

        this.ensureDir(path.dirname(filePath));
        fs.writeFileSync(filePath, content, 'utf8');
    }

    private resolveSnippetFilePath(snippetsDir: string, snippetsDirPrefix: string, filename: string): string | null {
        const sanitizedFilename = path.basename(filename);
        const normalizedFilename = sanitizedFilename.toLowerCase();

        if (filename.includes('..') || sanitizedFilename.includes('..')) {
            console.warn(`DSFB Settings Sync: Skipping suspicious snippet filename "${filename}"`);
            return null;
        }

        if (!normalizedFilename.endsWith('.json') && !normalizedFilename.endsWith('.code-snippets')) {
            return null;
        }

        const resolvedFilePath = path.resolve(path.join(snippetsDir, sanitizedFilename));
        if (!this.normalizePathForComparison(resolvedFilePath).startsWith(snippetsDirPrefix)) {
            console.warn(`DSFB Settings Sync: Skipping out-of-bounds snippet filename "${filename}"`);
            return null;
        }

        return resolvedFilePath;
    }

    private normalizePathForComparison(filePath: string): string {
        return process.platform === 'win32'
            ? filePath.toLowerCase()
            : filePath;
    }
}
