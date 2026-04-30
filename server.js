const express = require("express");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://app.localpackmonster.com",
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// ENV vars
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;

const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// generate upload URL
app.get("/upload-url", async (req, res) => {
  try {
    const { filename, contentType, folder } = req.query;

    if (!filename || !contentType || !folder) {
      return res.status(400).json({
        error: "filename, contentType and folder are required"
      });
    }

    // sanitize folder (VERY important)
    const safeFolder = String(folder).replace(/[^a-zA-Z0-9-_]/g, "");

    const key = `${safeFolder}/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: 300 // seconds
    });

    res.json({
      url,
      key,
      publicUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Presign API running on port 3000");
});
