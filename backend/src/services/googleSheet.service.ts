import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Define the structure for the service account credentials
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

// Define the structure for sheet properties
export interface SheetStructure {
  title: string;
  headers: string[];
}

export class GoogleSheetService {
  private sheets: any;
  private drive: any;
  private auth: JWT;

  constructor(credentials: ServiceAccountCredentials) {
    this.auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Creates a new spreadsheet for an owner with predefined sheets and headers.
   * @param ownerName The name of the owner, to be used in the spreadsheet title.
   * @param sheetsStructure An array of objects defining the title and headers for each sheet.
   * @returns The ID of the newly created spreadsheet.
   */
  async createSpreadsheetForOwner(ownerName: string, sheetsStructure: SheetStructure[]): Promise<string | null> {
    try {
      // 1. Create the spreadsheet file
      const spreadsheet = await this.drive.files.create({
        requestBody: {
          name: `Rekap Harian - ${ownerName}`,
          mimeType: 'application/vnd.google-apps.spreadsheet',
        },
        fields: 'id',
      });

      const spreadsheetId = spreadsheet.data.id;
      if (!spreadsheetId) {
        throw new Error('Failed to create spreadsheet file.');
      }

      // 2. Prepare requests to rename the first sheet and add all other sheets
      const requests = sheetsStructure.map((sheet, index) => {
        if (index === 0) {
          // Request to rename the first sheet
          return {
            updateSheetProperties: {
              properties: { sheetId: 0, title: sheet.title },
              fields: 'title',
            },
          };
        } else {
          // Request to add a new sheet
          return {
            addSheet: {
              properties: { title: sheet.title },
            },
          };
        }
      });
      
      // Execute the batch update
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests,
        },
      });

      // 3. Add headers to all sheets using a consistent method
      for (const sheet of sheetsStructure) {
          await this.sheets.spreadsheets.values.append({
              spreadsheetId,
              range: `${sheet.title}!A1`, // Append at the first cell of each sheet
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                  values: [sheet.headers],
              },
          });
      }

      console.log(`Successfully created spreadsheet with ID: ${spreadsheetId}`);
      return spreadsheetId;
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      return null;
    }
  }

  /**
   * Appends data to a specific sheet in a spreadsheet.
   * @param spreadsheetId The ID of the spreadsheet.
   * @param sheetName The name of the sheet to append data to.
   * @param data The data rows to append.
   */
  async appendData(spreadsheetId: string, sheetName: string, data: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error(`Error appending data to sheet ${sheetName}:`, error);
    }
  }

  /**
   * Deletes a spreadsheet file from Google Drive.
   * @param fileId The ID of the spreadsheet file to delete.
   */
  async deleteSpreadsheet(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      console.log(`Successfully deleted spreadsheet with ID: ${fileId}`);
    } catch (error) {
      // Log the error but don't throw, so the main operation (e.g., tenant deletion) can continue.
      console.error(`Error deleting spreadsheet with ID ${fileId}:`, error);
    }
  }
}
