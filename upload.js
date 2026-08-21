const axios = require("axios");
const fs = require("fs");
const path = require("path");

const IG_USER_ID = process.env.IG_USER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GRAPH_URL = "https://graph.instagram.com/v26.0";

const outputFolder = path.join(__dirname, "output_clips");
const uploadedFolder = path.join(__dirname, "uploaded");
if (!fs.existsSync(uploadedFolder)) fs.mkdirSync(uploadedFolder);

async function publishNextClip() {
  try {
    if (!fs.existsSync(outputFolder)) {
      console.log("Folder 'output_clips' does not exist.");
      return;
    }

    const files = fs.readdirSync(outputFolder).filter((file) => file.endsWith(".mp4"));
    if (files.length === 0) {
      console.log("No clips found in 'output_clips'.");
      return;
    }

    // Smart natural sorting (Understands 1A vs 1B, and knows 6 comes before 10)
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    
    const file = files[0];
    
    // Extract the part number for the caption
    const match = file.match(/part\s*(\d+)/i);
    const partNumber = match ? match[1] : "1";
    
    // Inject the number dynamically into the caption
    const clipCaption = `#part${partNumber} Doraemon' Bids Farewell After 37 years,

Fans Flood Social Media;

: Read More

For millions of viewers in Indonesia, a beloved Sunday morning ritual has quietly come to an end.

After nearly 37 years on the air, the iconic Japanese anime Doraemon, the story of a blue robot cat from the future and his friend Nobita has officially stopped broadcasting on the Indonesian television network RCTI.

First aired in 1989, more than just a cartoon, it was a daily companion, a source of laughter, life lessons, and weekend routines for millions across the country.

Fans noticed the absence of Doraemon from RCTI's schedule in late December 2025 and confirmed in early January 2026 that the show would no longer air.

The announcement sparked an outpouring of emotion on social media, with platforms flooded with nostalgic posts, heartfelt messages, and memories of watching Doraemon with family and friends.

While RCTI has not officially explained the reason behind the move, the shift comes amid evolving viewing habits and the rise of digital streaming platforms, where some episodes and films may still be available.

#Entertainment #Doraemon #Nostalgia #childhood
#Doreamon
Doraemon
DoreamonLover
Nobita
Cartoon
BestFriends
Friendship
Shizuka
Doremon
nobitalovers
nostalgic`;
    
    const videoUrl = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/output_clips/${encodeURIComponent(file)}`;
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
    
    // Move the file so it doesn't post again
    fs.renameSync(path.join(outputFolder, file), path.join(uploadedFolder, file));
    
  } catch (err) {
    console.error("Upload failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    process.exit(1);
  }
}
publishNextClip();
