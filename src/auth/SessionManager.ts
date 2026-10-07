import { SessionContext } from '../types';
import { Logger } from '../utils/Logger';

export class SessionManager {
  private sessions: Map<string, SessionContext> = new Map();

  /**
   * Register a new authenticated session for a specific role.
   */
  public registerSession(role: string, session: SessionContext): void {
    const roleKey = role.toLowerCase();
    Logger.info(`Registering new session context for role: '${role}' (User: ${session.email})`);
    this.sessions.set(roleKey, session);
  }

  /**
   * Retrieve session for a role.
   */
  public getSession(role: string): SessionContext {
    const roleKey = role.toLowerCase();
    const session = this.sessions.get(roleKey);
    if (!session) {
      throw new Error(`No authenticated session found for role '${role}'. Please authenticate first.`);
    }
    return session;
  }

  /**
   * Check if session exists for a role.
   */
  public hasSession(role: string): boolean {
    return this.sessions.has(role.toLowerCase());
  }

  /**
   * Clear all sessions to prevent cross-test state leakage.
   */
  public clearAllSessions(): void {
    Logger.info('Clearing all active session contexts');
    this.sessions.clear();
  }
}
