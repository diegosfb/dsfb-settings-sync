import * as vscode from 'vscode';

export interface MarketplaceEntry {
    domain: string;
    url: string;
}

/**
 * Extracts the domain key from a URL (hostname, e.g. "open-vsx.org").
 * Returns empty string if the URL is invalid.
 */
export function extractDomainKey(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

export class MarketplaceManager {
    /**
     * Returns the registry as an ordered array using marketplaceScanOrder.
     * Entries not in the order list are appended at the end.
     */
    getOrderedMarketplaces(): MarketplaceEntry[] {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const registry = config.get<Record<string, string>>('marketplaceRegistry', {});
        const order = config.get<string[]>('marketplaceScanOrder', []);

        const orderedDomains = [
            ...order.filter(d => d in registry),
            ...Object.keys(registry).filter(d => !order.includes(d)),
        ];

        return orderedDomains.map(domain => ({ domain, url: registry[domain] }));
    }

    getRegistry(): Record<string, string> {
        return vscode.workspace.getConfiguration('dsfbSettingsSync')
            .get<Record<string, string>>('marketplaceRegistry', {});
    }

    getScanOrder(): string[] {
        return vscode.workspace.getConfiguration('dsfbSettingsSync')
            .get<string[]>('marketplaceScanOrder', []);
    }

    async addMarketplace(url: string): Promise<{ domain: string } | undefined> {
        const domain = extractDomainKey(url);
        if (!domain) {
            vscode.window.showErrorMessage(`DSFB Settings Sync: Invalid marketplace URL — "${url}"`);
            return undefined;
        }

        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const registry = { ...config.get<Record<string, string>>('marketplaceRegistry', {}) };
        registry[domain] = url.replace(/\/$/, '');

        const order = [...config.get<string[]>('marketplaceScanOrder', [])];
        if (!order.includes(domain)) {
            order.push(domain);
        }

        await config.update('marketplaceRegistry', registry, vscode.ConfigurationTarget.Global);
        await config.update('marketplaceScanOrder', order, vscode.ConfigurationTarget.Global);

        return { domain };
    }

    async removeMarketplace(domain: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('dsfbSettingsSync');
        const registry = { ...config.get<Record<string, string>>('marketplaceRegistry', {}) };
        delete registry[domain];

        const order = config.get<string[]>('marketplaceScanOrder', []).filter(d => d !== domain);

        await config.update('marketplaceRegistry', registry, vscode.ConfigurationTarget.Global);
        await config.update('marketplaceScanOrder', order, vscode.ConfigurationTarget.Global);
    }

    async reorderMarketplace(newOrder: string[]): Promise<void> {
        await vscode.workspace.getConfiguration('dsfbSettingsSync')
            .update('marketplaceScanOrder', newOrder, vscode.ConfigurationTarget.Global);
    }

    /**
     * Returns all base URLs in scan order (for use by marketplaceChecker).
     */
    getOrderedUrls(): string[] {
        return this.getOrderedMarketplaces().map(e => e.url);
    }
}

export const marketplaceManager = new MarketplaceManager();
