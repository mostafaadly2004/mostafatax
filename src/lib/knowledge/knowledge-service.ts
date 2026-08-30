/**
 * Central Knowledge Service Manager
 * Cloud Firestore is the SINGLE SOURCE OF TRUTH for all Knowledge Base operations and AI Grounding.
 */

import { FirestoreKnowledgeBaseService } from './firestore-knowledge-base.ts';
import { KnowledgeBaseProvider, KnowledgeRecord, KnowledgeBaseStats, KnowledgeBaseDiagnostics } from './types.ts';

class KnowledgeServiceManager {
  private firestoreService: FirestoreKnowledgeBaseService;

  constructor() {
    this.firestoreService = new FirestoreKnowledgeBaseService();
  }

  getActiveService(): FirestoreKnowledgeBaseService {
    return this.firestoreService;
  }

  getFirestoreService(): FirestoreKnowledgeBaseService {
    return this.firestoreService;
  }

  getSheetsService(): FirestoreKnowledgeBaseService {
    return this.firestoreService;
  }

  /**
   * Reset and reload all knowledge base data
   */
  async resetKnowledgeBase(): Promise<boolean> {
    return this.firestoreService.resetCache();
  }

  /**
   * Seeds initial 48 tax questions into Firestore if needed
   */
  async seedInitialKnowledge(): Promise<number> {
    return this.firestoreService.seedInitialKnowledge();
  }

  /**
   * Sync/import records into Firestore
   */
  async syncWithGoogleSheets(
    spreadsheetId: string,
    sheetTitle: string,
    sheetName: string,
    records: KnowledgeRecord[]
  ): Promise<{ success: boolean; rowCount: number; contentHash: string; version: number }> {
    for (const record of records) {
      await this.firestoreService.upsertRecord(record, { uid: 'sheets_sync', name: 'Google Sheets Importer' });
    }
    await this.firestoreService.resetCache();
    const diag = this.firestoreService.getDiagnostics();
    return {
      success: true,
      rowCount: records.length,
      contentHash: diag.contentHash,
      version: diag.version
    };
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    return this.firestoreService.getStats();
  }

  getDiagnostics(): KnowledgeBaseDiagnostics {
    return this.firestoreService.getDiagnostics();
  }
}

// Global Singleton instance
export const knowledgeManager = new KnowledgeServiceManager();
export const knowledgeService = knowledgeManager.getActiveService();
export const firestoreKnowledgeService = knowledgeService;
