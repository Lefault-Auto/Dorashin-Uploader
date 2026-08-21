const axios = require("axios");
const fs = require("fs");
const path = require("path");

const IG_USER_ID = process.env.IG_USER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GRAPH_URL = "https://graph.instagram.com/v26.0";

const outputFolder = path.join(__dirname, "output");
const uploadedFolder = path.join(__dirname, "uploaded");
if (!fs.existsSync(uploadedFolder)) fs.mkdirSync(uploadedFolder);

async function publishNextClip() {
  try {
    const files = fs.readdirSync(outputFolder).filter((file) => file.endsWith(".mp4"));
    if (files.length === 0) {
      console.log("No clips found in 'output'.");
      return;
    }

    // Sort numerically
    files.sort((a, b) => parseInt(a.match(/\d+/)?.[0] || 0) - parseInt(b.match(/\d+/)?.[0] || 0));
    const file = files[0];
    
    // Caption logic: Check for matching .txt file
    const txtFile = path.join(outputFolder, file.replace(".mp4", ".txt"));
    let clipCaption = "Doraemon' Bids Farewell After 37 years...\n\n#Entertainment #Doraemon #Nostalgia #childhood";
    if (fs.existsSync(txtFile)) {
      clipCaption = fs.readFileSync(txtFile, "utf-8");
    }
    
    // Public raw GitHub URL
    const videoUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/output/${encodeURIComponent(file)}`;
    console.log(`Uploading ${file} from GitHub to Meta...`);

    const containerRes = await axios.post(`${GRAPH_URL}/${IG_USER_ID}/media`, {
      media_type: "REELS",
      video_url: videoUrl,
      caption: clipCaption,
      share_to_feed: true,
      access_token: ACCESS_TOKEN,
    });

    const containerId = containerRes.data.id;
    console.log(`Container created (${containerId}). Polling...`);

    let ready = false;
    while (!ready) {
      await new Promise((r) => setTimeout(r, 20000));
      const statusRes = await axios.get(`${GRAPH_URL}/${containerId}`, {
        params: { fields: "status_code", access_token: ACCESS_TOKEN },
      });
      if (statusRes.data.status_code === "FINISHED") ready = true;
      else if (statusRes.data.status_code === "ERROR") throw new Error("Meta rejected format.");
    }

    const publishRes = await axios.post(`${GRAPH_URL}/${IG_USER_ID}/media_publish`, {
      creation_id: containerId,
      access_token: ACCESS_TOKEN,
    });
    console.log(`Successfully Published! ID: ${publishRes.data.id}`);
    
    // Move both files to uploaded folder
    fs.renameSync(path.join(outputFolder, file), path.join(uploadedFolder, file));
    if (fs.existsSync(txtFile)) {
      fs.renameSync(txtFile, path.join(uploadedFolder, path.basename(txtFile)));
    }
  } catch (err) {
    console.error("Upload failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    process.exit(1);
  }
}
publishNextClip();