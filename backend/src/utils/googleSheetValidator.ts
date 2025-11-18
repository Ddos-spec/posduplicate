import { GoogleSheetService } from '../services/googleSheet.service';

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

export class GoogleSheetValidator {
  private googleSheetService: GoogleSheetService;

  constructor(credentials: ServiceAccountCredentials) {
    this.googleSheetService = new GoogleSheetService(credentials);
  }

  /**
   * Validates if the Google API credentials are working properly
   * by attempting to create and delete a temporary test spreadsheet
   */
  async validateCredentials(): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Create a temporary test spreadsheet
      const testName = `Test-Sheet-${Date.now()}`;
      const testSheetId = await this.googleSheetService.createSpreadsheetForOwner(
        testName,
        [
          {
            title: 'Test Sheet',
            headers: ['Test', 'Validation'],
          }
        ]
      );

      if (!testSheetId) {
        return {
          isValid: false,
          error: 'Could not create test spreadsheet. Check your Google API credentials and permissions.'
        };
      }

      // Clean up - delete the test spreadsheet
      await this.googleSheetService.deleteSpreadsheet(testSheetId);

      return {
        isValid: true
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Unknown error occurred during validation'
      };
    }
  }
}