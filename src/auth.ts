import * as vscode from "vscode";

const AUTH_PROVIDER_ID = "github";
const SCOPES = ["gist"];

/**
 * GitHub Authentication module using VS Code's built-in GitHub auth provider.
 * Users sign in via the standard VS Code GitHub login flow — no PAT required.
 */
export class AuthManager {
  private session: vscode.AuthenticationSession | null = null;
  private readonly onDidChangeEmitter =
    new vscode.EventEmitter<vscode.AuthenticationSession | null>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private context: vscode.ExtensionContext) {
    // Listen for session changes (login / logout from VS Code accounts)
    context.subscriptions.push(
      vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === AUTH_PROVIDER_ID) {
          await this.refreshSession();
        }
      }),
    );
  }

  /**
   * Prompt the user to log in (creates session if none exists).
   */
  async login(): Promise<vscode.AuthenticationSession | null> {
    try {
      this.session = await vscode.authentication.getSession(
        AUTH_PROVIDER_ID,
        SCOPES,
        { createIfNone: true },
      );
      this.onDidChangeEmitter.fire(this.session);
      if (this.session) {
        vscode.window.showInformationMessage(
          `Soloboi\'s Settings Sync: GitHub에 로그인되었습니다. (${this.session.account.label})`,
        );
      }
      return this.session;
    } catch (err: any) {
      vscode.window.showErrorMessage(
        `Soloboi\'s Settings Sync: GitHub 로그인 실패 — ${err.message}`,
      );
      return null;
    }
  }

  /**
   * Silently try to get the existing session without prompting.
   */
  async getSessionSilent(): Promise<vscode.AuthenticationSession | null> {
    try {
      this.session = (await vscode.authentication.getSession(
        AUTH_PROVIDER_ID,
        SCOPES,
        { createIfNone: false },
      )) || null;
      return this.session;
    } catch {
      return null;
    }
  }

  /**
   * Get the current access token, or null if not logged in.
   */
  async getToken(): Promise<string | null> {
    const session = this.session ?? (await this.getSessionSilent());
    return session?.accessToken ?? null;
  }

  /**
   * Check if the user is currently logged in.
   */
  isLoggedIn(): boolean {
    return this.session !== null;
  }

  /**
   * Get the account label (username).
   */
  getAccountLabel(): string | null {
    return this.session?.account.label ?? null;
  }

  /**
   * Logout — clear session reference.
   */
  async logout(): Promise<void> {
    this.session = null;
    this.onDidChangeEmitter.fire(null);
    vscode.window.showInformationMessage(
      "Soloboi\'s Settings Sync: GitHub에서 로그아웃되었습니다.",
    );
  }

  /**
   * Refresh the internal session reference.
   */
  private async refreshSession(): Promise<void> {
    const prev = this.session;
    this.session = await this.getSessionSilent();
    if (prev?.accessToken !== this.session?.accessToken) {
      this.onDidChangeEmitter.fire(this.session);
    }
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
