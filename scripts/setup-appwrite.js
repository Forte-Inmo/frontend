#!/usr/bin/env node

/**
 * Appwrite Setup Script — Forte
 * Crea la base de datos, todas las colecciones con sus atributos e índices,
 * y el bucket de storage con permisos públicos de lectura.
 *
 * Uso:
 *   node setup-appwrite.js
 *
 * Variables de entorno requeridas (se leen automáticamente del .env):
 *   VITE_APPWRITE_ENDPOINT
 *   VITE_APPWRITE_PROJECT_ID
 *   VITE_APPWRITE_API_KEY   ← única variable que NO está en tu .env (ver README abajo)
 */

import { Client, Databases, Storage, Permission, Role, DatabasesIndexType as IndexType } from "node-appwrite";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Cargar .env manualmente (sin depender de dotenv) ────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
    }
} catch {
    // Si no encuentra el .env, usa variables de entorno del sistema
}

// ─── Configuración ────────────────────────────────────────────────────────────
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || "https://appwrite.borei.com.ar/v1";
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.VITE_APPWRITE_API_KEY;      // Server API Key (con permisos de databases + storage)
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || "informes";

// IDs de colecciones
const COLLS = {
    SETTINGS: process.env.VITE_APPWRITE_COLL_SETTINGS || "platform_settings",
    CAMPOS: process.env.VITE_APPWRITE_COLL_CAMPOS || "campos",
    INFORMES: process.env.VITE_APPWRITE_COLL_INFORMES || "informes",
    PROFILES: process.env.VITE_APPWRITE_COLL_PROFILES || "profiles",
    ROLES: process.env.VITE_APPWRITE_COLL_ROLES || "roles",
    PERMISSIONS: process.env.VITE_APPWRITE_COLL_PERMISSIONS || "permissions",
    ROLE_PERMISSIONS: process.env.VITE_APPWRITE_COLL_ROLE_PERMISSIONS || "role_permissions",
};
const BUCKET_ID = process.env.VITE_APPWRITE_BUCKET_ASSETS || "assets";

// ─── Validaciones ─────────────────────────────────────────────────────────────
if (!PROJECT_ID) {
    console.error("❌  Falta VITE_APPWRITE_PROJECT_ID en el .env");
    process.exit(1);
}
if (!API_KEY) {
    console.error("❌  Falta VITE_APPWRITE_API_KEY.");
    console.error("   Generala en: Appwrite Console → Settings → API Keys");
    console.error("   Permisos mínimos: databases.read, databases.write, storage.read, storage.write");
    console.error("   Luego agregala al .env como: VITE_APPWRITE_API_KEY=standard_xxxx");
    process.exit(1);
}

// ─── Cliente Appwrite ─────────────────────────────────────────────────────────
const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const db = new Databases(client);
const storage = new Storage(client);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeCreate(label, fn) {
    try {
        const result = await fn();
        console.log(`  ✅  ${label}`);
        return result;
    } catch (err) {
        if (err?.code === 409) {
            console.log(`  ⚠️   ${label} (ya existe, se omite)`);
        } else {
            console.error(`  ❌  ${label}: ${err?.message || err}`);
        }
    }
}

// Appwrite necesita un pequeño delay entre la creación de atributos
async function addAttr(collId, fn, label) {
    await safeCreate(label, fn);
    await sleep(300);
}

// ─── 1. Base de datos ─────────────────────────────────────────────────────────
async function createDatabase() {
    console.log("\n📦  Base de datos...");
    await safeCreate(`Database: ${DATABASE_ID}`, () =>
        db.create(DATABASE_ID, "Informes")
    );
}

// ─── 2. Colección: platform_settings ─────────────────────────────────────────
async function createSettings() {
    const id = COLLS.SETTINGS;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Platform Settings", [
            Permission.read(Role.any()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "website_name", 256, false), "attr: website_name");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "background_url", 2048, false), "attr: background_url");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org1_name", 256, false), "attr: org1_name");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org1_logo_url", 2048, false), "attr: org1_logo_url");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org1_address", 512, false), "attr: org1_address");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org1_phone", 256, false), "attr: org1_phone");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org2_name", 256, false), "attr: org2_name");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org2_logo_url", 2048, false), "attr: org2_logo_url");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org2_address", 512, false), "attr: org2_address");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "org2_phone", 256, false), "attr: org2_phone");
}

// ─── 3. Colección: campos ─────────────────────────────────────────────────────
async function createCampos() {
    const id = COLLS.CAMPOS;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Campos", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "nombre", 256, true), "attr: nombre");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "alias_comercial", 256, false), "attr: alias_comercial");
    await addAttr(id, () => db.createFloatAttribute(DATABASE_ID, id, "superficie_total", false), "attr: superficie_total");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "uso", 32, false), "attr: uso");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "provincia", 256, false), "attr: provincia");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "departamento", 256, false), "attr: departamento");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "descripcion", 65535, false), "attr: descripcion");
    await addAttr(id, () => db.createFloatAttribute(DATABASE_ID, id, "latitud", false), "attr: latitud");
    await addAttr(id, () => db.createFloatAttribute(DATABASE_ID, id, "longitud", false), "attr: longitud");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "coordenadas_poligono", 65535, false), "attr: coordenadas_poligono");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "updated_by", 36, false), "attr: updated_by");
    await addAttr(id, () => db.createBooleanAttribute(DATABASE_ID, id, "activo", false), "attr: activo");

    await safeCreate(`Index: nombre`, () =>
        db.createIndex(DATABASE_ID, id, "idx_nombre", IndexType.Fulltext, ["nombre"])
    );
}

// ─── 4. Colección: informes ───────────────────────────────────────────────────
async function createInformes() {
    const id = COLLS.INFORMES;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Informes", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "campo_id", 36, true), "attr: campo_id");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "pages_data", 65535, false), "attr: pages_data");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "titulo", 256, false), "attr: titulo");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "estado", 64, false), "attr: estado");
    await addAttr(id, () => db.createDatetimeAttribute(DATABASE_ID, id, "fecha_informe", false), "attr: fecha_informe");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "created_by", 36, false), "attr: created_by");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "updated_by", 36, false), "attr: updated_by");

    await safeCreate(`Index: campo_id`, () =>
        db.createIndex(DATABASE_ID, id, "idx_campo_id", IndexType.Key, ["campo_id"])
    );
}

// ─── 5. Colección: roles ──────────────────────────────────────────────────────
async function createRoles() {
    const id = COLLS.ROLES;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Roles", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "name", 128, true), "attr: name");
    await addAttr(id, () => db.createBooleanAttribute(DATABASE_ID, id, "is_admin", false), "attr: is_admin");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "description", 512, false), "attr: description");
}

// ─── 6. Colección: permissions ────────────────────────────────────────────────
async function createPermissions() {
    const id = COLLS.PERMISSIONS;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Permissions", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "name", 128, true), "attr: name");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "description", 512, false), "attr: description");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "module", 128, false), "attr: module");
}

// ─── 7. Colección: role_permissions ──────────────────────────────────────────
async function createRolePermissions() {
    const id = COLLS.ROLE_PERMISSIONS;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Role Permissions", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "role_id", 36, true), "attr: role_id");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "permission_id", 36, true), "attr: permission_id");

    await safeCreate(`Index: role_id`, () =>
        db.createIndex(DATABASE_ID, id, "idx_role_id", IndexType.Key, ["role_id"])
    );
    await safeCreate(`Index: compuesto role+permission`, () =>
        db.createIndex(DATABASE_ID, id, "idx_role_perm", IndexType.Unique, ["role_id", "permission_id"])
    );
}

// ─── 8. Colección: profiles ───────────────────────────────────────────────────
async function createProfiles() {
    const id = COLLS.PROFILES;
    console.log(`\n📋  Colección: ${id}`);

    await safeCreate(`Colección ${id}`, () =>
        db.createCollection(DATABASE_ID, id, "Profiles", [
            Permission.read(Role.users()),
            Permission.write(Role.users()),
        ])
    );

    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "email", 256, true), "attr: email");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "full_name", 256, false), "attr: full_name");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "role_id", 36, false), "attr: role_id");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "avatar_id", 256, false), "attr: avatar_id");
    await addAttr(id, () => db.createStringAttribute(DATABASE_ID, id, "user_id", 36, false), "attr: user_id");
    await addAttr(id, () => db.createBooleanAttribute(DATABASE_ID, id, "activo", false), "attr: activo");

    await safeCreate(`Index: email`, () =>
        db.createIndex(DATABASE_ID, id, "idx_email", IndexType.Unique, ["email"])
    );
    await safeCreate(`Index: user_id`, () =>
        db.createIndex(DATABASE_ID, id, "idx_user_id", IndexType.Key, ["user_id"])
    );
}

// ─── 9. Bucket: assets ───────────────────────────────────────────────────────
async function createBucket() {
    console.log(`\n🪣  Bucket: ${BUCKET_ID}`);

    await safeCreate(`Bucket ${BUCKET_ID}`, () =>
        storage.createBucket(
            BUCKET_ID,
            "Assets",
            [
                Permission.read(Role.any()),          // lectura pública
                Permission.create(Role.users()),      // subida solo usuarios autenticados
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ],
            false,   // fileSecurity
            true,    // enabled
            30 * 1024 * 1024,  // maxFileSize: 30 MB
            ["jpg", "jpeg", "png", "webp", "gif", "svg", "pdf"]
        )
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log("🚀  Forte — Setup Appwrite");
    console.log(`   Endpoint:  ${ENDPOINT}`);
    console.log(`   Project:   ${PROJECT_ID}`);
    console.log(`   Database:  ${DATABASE_ID}`);

    await createDatabase();
    await createSettings();
    await createCampos();
    await createInformes();
    await createRoles();
    await createPermissions();
    await createRolePermissions();
    await createProfiles();
    await createBucket();

    console.log("\n✨  Setup completado!\n");
    console.log("   Próximos pasos:");
    console.log("   1. Verificá en la consola que todas las colecciones aparezcan");
    console.log("   2. Insertá un documento inicial en platform_settings con tu config");
    console.log("   3. Insertá al menos un rol admin en la colección roles");
}

main().catch((err) => {
    console.error("\n💥  Error fatal:", err?.message || err);
    process.exit(1);
});