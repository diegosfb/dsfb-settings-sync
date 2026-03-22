import * as vscode from 'vscode';
import * as https from 'https';
import { pollGitHubDeviceAuthorization } from './prototypes/playwrightAuthHelper';

const AUTH_PROVIDER_ID = 'github';
const SCOPES = ['gist'];
const DEVICE_CODE_CLIENT_ID_ENV_KEYS = ['GITHUB_DEVICE_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_ID'];
const FALLBACK_TOKEN_KEY = 'soloboisSettingsSync.deviceCodeToken';
const FALLBACK_ACCOUNT_LABEL_KEY = 'soloboisSettingsSync.deviceCodeAccountLabel';
const FALLBACK_ACCOUNT_ID_KEY = 'soloboisSettingsSync.deviceCodeAccountId';

type GitHubDeviceCodeResponse = {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
};

type GitHubUserResponse = {
  login?: string;
  id?: number;
  name?: string;
};

/**
 * GitHub Authentication module using VS Code's built-in GitHub auth provider.
 * Falls back to GitHub device code login when the built-in provider fails and a client ID is available.
 */
export class AuthManager {
  private session: vscode.AuthenticationSession | null = null;
  private readonly onDidChangeEmitter =
    new vscode.EventEmitter<vscode.AuthenticationSession | null>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === AUTH_PROVIDER_ID) {
          await this.refreshSession();
        }
      }),
    );
  }

  async login(): Promise<vscode.AuthenticationSession | null> {
    try {
      this.session = await vscode.authentication.getSession(
        AUTH_PROVIDER_ID,
        SCOPES,
        { createIfNone: true },
      );
    } catch (err: any) {
      this.session = await this.loginWithDeviceCodeFallback(err);
    }

    this.onDidChangeEmitter.fire(this.session);
    if (this.session) {
      vscode.window.showInformationMessage(
        `Soloboi's Settings Sync: GitHub??濡쒓렇?몃릺?덉뒿?덈떎. (${this.session.account.label})`,
      );
    }
    return this.session;
  }

  async getSessionSilent(): Promise<vscode.AuthenticationSession | null> {
    try {
      this.session = (await vscode.authentication.getSession(
        AUTH_PROVIDER_ID,
        SCOPES,
        { createIfNone: false },
      )) || null;
    } catch {
      this.session = null;
    }

    if (this.session) {
      return this.session;
    }

    this.session = await this.getStoredDeviceCodeSession();
    return this.session;
  }

  async getToken(): Promise<string | null> {
    const session = this.session ?? (await this.getSessionSilent());
    return session?.accessToken ?? null;
  }

  isLoggedIn(): boolean {
    return this.session !== null;
  }

  getSession(): vscode.AuthenticationSession | null {
    return this.session;
  }

  getAccountLabel(): string | null {
    return this.session?.account.label ?? null;
  }

  async logout(): Promise<void> {
    this.session = null;
    await this.clearStoredDeviceCodeSession();
    this.onDidChangeEmitter.fire(null);
    vscode.window.showInformationMessage(
      'Soloboi\'s Settings Sync: GitHub?먯꽌 濡쒓렇?꾩썐?섏뿀?듬땲??',
    );
  }

  private async refreshSession(): Promise<void> {
    const previousToken = this.session?.accessToken ?? null;
    this.session = await this.getSessionSilent();
    if (previousToken !== (this.session?.accessToken ?? null)) {
      this.onDidChangeEmitter.fire(this.session);
    }
  }

  private async loginWithDeviceCodeFallback(
    originalError: Error,
  ): Promise<vscode.AuthenticationSession | null> {
    const clientId = this.getDeviceCodeClientId();
    if (!clientId) {
      vscode.window.showErrorMessage(
        `Soloboi's Settings Sync: GitHub 濡쒓렇???ㅽ뙣 ??${originalError.message}`,
      );
      return null;
    }

    try {
      const deviceCode = await this.requestDeviceCode(clientId);
      if (!deviceCode.device_code || !deviceCode.verification_uri || !deviceCode.expires_in) {
        throw new Error('GitHub device code response was incomplete.');
      }

      const verificationUrl = deviceCode.verification_uri_complete || deviceCode.verification_uri;
      await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));

      const action = deviceCode.user_code ? 'Copy Code' : undefined;
      const prompt = deviceCode.user_code
        ? `釉뚮씪?곗??먯꽌 GitHub ?몄쬆???꾨즺?섏꽭?? 肄붾뱶: ${deviceCode.user_code}`
        : '釉뚮씪?곗??먯꽌 GitHub ?몄쬆???꾨즺?섏꽭??';
      if (action) {
        vscode.window.showInformationMessage(prompt, action).then(selection => {
          if (selection === action && deviceCode.user_code) {
            void vscode.env.clipboard.writeText(deviceCode.user_code);
          }
        });
      } else {
        vscode.window.showInformationMessage(prompt);
      }

      const result = await pollGitHubDeviceAuthorization({
        clientId,
        deviceCode: deviceCode.device_code,
        intervalSeconds: deviceCode.interval ?? 5,
        expiresInSeconds: deviceCode.expires_in,
      });

      if (result.status !== 'approved' || !result.accessToken) {
        const reason = result.error || result.status;
        throw new Error(`Device code login was not approved (${reason}).`);
      }

      const account = await this.fetchGitHubUser(result.accessToken);
      const session = this.createDeviceCodeSession(
        result.accessToken,
        account.login || account.name || 'GitHub Device Code',
        account.id ? String(account.id) : 'device-code',
      );

      await this.storeDeviceCodeSession(session);
      return session;
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Soloboi's Settings Sync: GitHub 濡쒓렇???ㅽ뙣 ??${err.message}`,
      );
      return null;
    }
  }

  private getDeviceCodeClientId(): string | null {
    for (const key of DEVICE_CODE_CLIENT_ID_ENV_KEYS) {
      const value = (process.env[key] || '').trim();
      if (value) {
        return value;
      }
    }
    return null;
  }

  private async requestDeviceCode(clientId: string): Promise<GitHubDeviceCodeResponse> {
    const body = new URLSearchParams({
      client_id: clientId,
      scope: SCOPES.join(' '),
    }).toString();

    return this.requestJson<GitHubDeviceCodeResponse>({
      hostname: 'github.com',
      path: '/login/device/code',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString(),
        'User-Agent': 'antigravity-sync',
      },
      body,
    });
  }

  private async fetchGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
    return this.requestJson<GitHubUserResponse>({
      hostname: 'api.github.com',
      path: '/user',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'antigravity-sync',
      },
    });
  }

  private createDeviceCodeSession(
    accessToken: string,
    accountLabel: string,
    accountId: string,
  ): vscode.AuthenticationSession {
    return {
      id: `device-code:${accountId}`,
      accessToken,
      account: {
        id: accountId,
        label: accountLabel,
      },
      scopes: [...SCOPES],
    };
  }

  private async getStoredDeviceCodeSession(): Promise<vscode.AuthenticationSession | null> {
    const token = await this.context.secrets.get(FALLBACK_TOKEN_KEY);
    if (!token) {
      return null;
    }

    const accountLabel = this.context.globalState.get<string>(
      FALLBACK_ACCOUNT_LABEL_KEY,
      'GitHub Device Code',
    );
    const accountId = this.context.globalState.get<string>(
      FALLBACK_ACCOUNT_ID_KEY,
      'device-code',
    );

    return this.createDeviceCodeSession(token, accountLabel, accountId);
  }

  private async storeDeviceCodeSession(session: vscode.AuthenticationSession): Promise<void> {
    await this.context.secrets.store(FALLBACK_TOKEN_KEY, session.accessToken);
    await this.context.globalState.update(FALLBACK_ACCOUNT_LABEL_KEY, session.account.label);
    await this.context.globalState.update(FALLBACK_ACCOUNT_ID_KEY, session.account.id);
  }

  private async clearStoredDeviceCodeSession(): Promise<void> {
    await this.context.secrets.delete(FALLBACK_TOKEN_KEY);
    await this.context.globalState.update(FALLBACK_ACCOUNT_LABEL_KEY, undefined);
    await this.context.globalState.update(FALLBACK_ACCOUNT_ID_KEY, undefined);
  }

  private async requestJson<T>(options: {
    hostname: string;
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<T> {
    const responseText = await new Promise<string>((resolve, reject) => {
      const request = https.request({
        hostname: options.hostname,
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers,
      }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          body += chunk;
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode >= 200 && statusCode < 300) {
            resolve(body);
            return;
          }
          reject(new Error(`HTTP ${statusCode}: ${body}`));
        });
      });

      request.on('error', reject);
      if (options.body) {
        request.write(options.body);
      }
      request.end();
    });

    try {
      return JSON.parse(responseText) as T;
    } catch {
      throw new Error('Failed to parse GitHub authentication response.');
    }
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}

