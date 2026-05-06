import { Client, Databases, ID } from "node-appwrite";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

const env = {};
const raw = readFileSync(envPath, "utf8");
for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
}

const client = new Client()
    .setEndpoint(env.VITE_APPWRITE_ENDPOINT)
    .setProject(env.VITE_APPWRITE_PROJECT_ID)
    .setKey(env.VITE_APPWRITE_API_KEY);

const db = new Databases(client);

async function initSettings() {
    const databaseId = env.VITE_APPWRITE_DATABASE_ID;
    const collectionId = env.VITE_APPWRITE_COLL_SETTINGS;

    try {
        const existing = await db.listDocuments(databaseId, collectionId);
        if (existing.total > 0) {
            console.log("✅ Settings already initialized.");
            return;
        }

        await db.createDocument(databaseId, collectionId, ID.unique(), {
            website_name: "Forte Informes",
            org1_name: "Santa Rosa",
            org2_name: "General Pico",
            org1_logo_url: "",
            org2_logo_url: "",
            background_url: ""
        });
        console.log("✨ Default settings created!");
    } catch (error) {
        console.error("❌ Error initializing settings:", error);
    }
}

initSettings();
