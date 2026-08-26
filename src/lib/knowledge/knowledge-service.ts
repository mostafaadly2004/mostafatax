/**
 * Central Knowledge Base Service Factory / Singleton
 * Provides unified access to active knowledge provider (Demo vs. Google Sheets).
 */

import { KnowledgeBaseService, KnowledgeRecord } from './types.ts';
import { DemoKnowledgeBaseService } from './demo-knowledge-base.ts';
import { GoogleSheetsKnowledgeBaseService } from './sheets-knowledge-base.ts';

class KnowledgeServiceManager {
  private activeService: KnowledgeBaseService;
  private demoService: DemoKnowledgeBaseService;
  private sheetsService: GoogleSheetsKnowledgeBaseService;

  constructor() {
    this.demoService = new DemoKnowledgeBaseService();
    this.sheetsService = new GoogleSheetsKnowledgeBaseService();
    // Default to DemoKnowledgeBase in Phase 1, seamlessly swappable to GoogleSheets
    this.activeService = this.demoService;
  }

  getService(): KnowledgeBaseService {
    return this.activeService;
  }

  getDemoService(): DemoKnowledgeBaseService {
    return this.demoService;
  }

  getSheetsService(): GoogleSheetsKnowledgeBaseService {
    return this.sheetsService;
  }

  switchToGoogleSheets(spreadsheetId: string, sheetTitle: string, records: KnowledgeRecord[]): GoogleSheetsKnowledgeBaseService {
    this.sheetsService.setSpreadsheetDetails(spreadsheetId, sheetTitle, records);
    this.activeService = this.sheetsService;
    return this.sheetsService;
  }

  switchToDemo(): DemoKnowledgeBaseService {
    this.activeService = this.demoService;
    return this.demoService;
  }

  setProvider(newService: KnowledgeBaseService) {
    this.activeService = newService;
  }
}

export const knowledgeManager = new KnowledgeServiceManager();
export const knowledgeService = knowledgeManager.getService();
