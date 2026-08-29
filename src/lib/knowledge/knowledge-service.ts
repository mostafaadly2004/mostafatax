/**
 * Central Knowledge Service Manager
 * Enforces Google Sheets as the ONLY Source of Truth for Knowledge Base.
 * No demo records, no hardcoded legal facts, no fallbacks.
 */

import { GoogleSheetsKnowledgeBaseService } from './sheets-knowledge-base.ts';
import { KnowledgeBaseProvider, KnowledgeRecord, KnowledgeBaseStats, KnowledgeBaseDiagnostics } from './types.ts';

class KnowledgeServiceManager {
  private sheetsService: GoogleSheetsKnowledgeBaseService;

  constructor() {
    this.sheetsService = new GoogleSheetsKnowledgeBaseService();
  }

  getActiveService(): KnowledgeBaseProvider {
    return this.sheetsService;
  }

  getSheetsService(): GoogleSheetsKnowledgeBaseService {
    return this.sheetsService;
  }

  /**
   * Replaces knowledge base snapshot atomically with current Google Sheets rows
   */
  async syncWithGoogleSheets(
    spreadsheetId: string,
    sheetTitle: string,
    sheetName: string = 'قاعدة المعرفة',
    records: KnowledgeRecord[]
  ) {
    return this.sheetsService.sync({
      spreadsheetId,
      spreadsheetTitle: sheetTitle,
      sheetName,
      records
    });
  }

  /**
   * Reset and purge all in-memory knowledge base caches
   */
  async resetKnowledgeBase(): Promise<boolean> {
    return this.sheetsService.resetCache();
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    return this.sheetsService.getStats();
  }

  getDiagnostics(): KnowledgeBaseDiagnostics {
    return this.sheetsService.getDiagnostics();
  }
}

// Global Singleton instance
export const knowledgeManager = new KnowledgeServiceManager();
export const knowledgeService = knowledgeManager.getActiveService();
