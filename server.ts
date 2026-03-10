import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const oauth2Client = new google.auth.OAuth2(
    process.env.VITE_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/callback`
  );

  // API Routes
  app.get("/api/auth/url", (req, res) => {
    const scopes = [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });

    res.json({ url });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      // In a real app, we'd store this in a session. 
      // For this demo, we'll send it back to the client to store in localStorage (with security warnings)
      // or just use it to get user info and then close.
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Proxy to get file content from Google Drive
  app.post("/api/drive/file-content", async (req, res) => {
    const { fileId, tokens } = req.body;
    if (!fileId || !tokens) {
      return res.status(400).json({ error: "Missing fileId or tokens" });
    }

    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth });

      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      const base64 = buffer.toString("base64");
      const fileMetadata = await drive.files.get({ fileId, fields: "mimeType,name" });

      res.json({
        base64,
        mimeType: fileMetadata.data.mimeType,
        name: fileMetadata.data.name,
      });
    } catch (error) {
      console.error("Error fetching file from Drive:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
