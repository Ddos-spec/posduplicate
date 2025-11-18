import { GoogleSheetValidator } from './src/utils/googleSheetValidator';

// Service Account Credentials from environment variables
const SERVICE_ACCOUNT_CREDENTIALS = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID || "peroject-whatsapp",
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "ee4e8f569dbd1345b6581b5edab5e2a2692ce941",
  private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL || "n8n-refresh-token@peroject-whatsapp.iam.gserviceaccount.com",
  client_id: process.env.GOOGLE_CLIENT_ID || "118421492513506607479",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/n8n-refresh-token%40peroject-whatsapp.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

async function validateGoogleApi() {
  console.log('Starting Google API validation...');
  
  try {
    const validator = new GoogleSheetValidator(SERVICE_ACCOUNT_CREDENTIALS);
    const result = await validator.validateCredentials();
    
    if (result.isValid) {
      console.log('✅ Google API validation successful!');
      console.log('Credentials are properly configured and functional.');
    } else {
      console.log('❌ Google API validation failed!');
      console.log('Error:', result.error);
      console.log('\nTroubleshooting tips:');
      console.log('1. Check if your Google Cloud project is properly set up');
      console.log('2. Ensure the Google Sheets and Google Drive APIs are enabled');
      console.log('3. Verify your service account has the correct permissions');
      console.log('4. Check that your environment variables are correctly set');
      console.log('5. Make sure the private key is properly formatted (with \\n characters)');
    }
  } catch (error) {
    console.error('❌ Error during validation:', error);
  }
}

// Run validation
validateGoogleApi();