const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const firebase = require('firebase-admin');
const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 4001;

// Set view engine to EJS
app.set('view engine', 'ejs');

// Initialize Firebase Admin SDK
firebase.initializeApp({
    credential: firebase.credential.cert({
        type: process.env.TYPE,
        project_id: process.env.PROJECT_ID,
        private_key_id: process.env.PRIVATE_KEY_ID,
        private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.CLIENT_EMAIL,
        client_id: process.env.CLIENT_ID,
        auth_uri: process.env.AUTH_URI,
        token_uri: process.env.TOKEN_URI,
        auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.CLIENT_X509_CERT_URL
    }),
    storageBucket: "gs://cqcq332211-debf0.appspot.com"
});

// Create storage engine for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route for file upload form (GET request)
app.get('/', (req, res) => {
    res.render('upload');
});

// Route for file upload (POST request)
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const bucket = firebase.storage().bucket();

        // Create a temporary file path
        const tempFilePath = path.join(os.tmpdir(), file.originalname);

        // Write the file buffer to the temporary file
        fs.writeFileSync(tempFilePath, file.buffer);

        // Upload the temporary file to Firebase Storage
        await bucket.upload(tempFilePath, {
            destination: file.originalname,
        });

        // Delete the temporary file
        fs.unlinkSync(tempFilePath);

        res.redirect('/files');
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// Route to get list of uploaded files
app.get('/files', async (req, res) => {
    try {
        const bucket = firebase.storage().bucket();

        // List files in Firebase Storage
        const [files] = await bucket.getFiles();

        // Render the files view with the list of files
        res.render('files', { files });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Error listing files' });
    }
});

// Route to download a file
app.get('/download/:filename', async (req, res) => {
    try {
        const bucket = firebase.storage().bucket();
        const file = bucket.file(req.params.filename);

        // Generate a download URL for the file
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '01-01-2100', // Adjust expiration date as needed
        });

        // Redirect to the download URL
        res.redirect(url);
    } catch (error) {
        console.error('Error generating download URL:', error);
        res.status(500).json({ error: 'Error generating download URL' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
