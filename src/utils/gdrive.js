const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../credentials.json'),
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

async function uploadToDrive(file) {
  const response = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${file.originalname}`,
      parents: ['1oMgwGQ9cVDIFdrYAjua-pLRFSMKtJyLf']
    },
    media: {
      mimeType: file.mimetype,
      body: Buffer.from(file.buffer)
    }
  });

  const fileId = response.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  return `https://drive.google.com/file/d/${fileId}/view`;
}

module.exports = { uploadToDrive };
