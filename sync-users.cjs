const { Client, Users, Databases, Query } = require('node-appwrite');

// --- CONFIGURACIÓN ---
const ENDPOINT = 'https://appwrite.borei.com.ar/v1'; // Cambiado de cloud.appwrite.io
const PROJECT_ID = '69efd35e00221b3d7091';
const API_KEY = 'standard_ba60774c9e48e55964d85243fcc95984c0eaf67d2693d626ace645d45230669e16c7539b4d80ef90fac28b46e17dd944e5d848988c060cda7c0e3812c18c11fcf4dd240d2e488f7a8e6269b914a569b363285b648d329f818a8c75281d59d56ffa84d6fca3d792bf400f046e8a8acce26ed090aa7ef83da2dd1e8f1edc425e61'; // Debe tener permisos de users.read y documents.write
const DATABASE_ID = 'informes';
const COLLECTION_PROFILES = 'profiles';

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const users = new Users(client);
const databases = new Databases(client);

async function sync() {
    try {
        console.log("🚀 Iniciando sincronización de usuarios...");
        const response = await users.list();
        const authUsers = response.users;
        console.log(`Found ${authUsers.length} users in Auth.`);

        for (const user of authUsers) {
            try {
                // Verificar si ya existe en la colección
                const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_PROFILES, [
                    Query.equal('email', user.email)
                ]);

                if (existing.total === 0) {
                    await databases.createDocument(DATABASE_ID, COLLECTION_PROFILES, user.$id, {
                        full_name: user.name || user.email.split('@')[0],
                        email: user.email,
                        activo: true
                    });
                    console.log(`✅ Creado perfil para: ${user.email}`);
                } else {
                    console.log(`- El usuario ${user.email} ya tiene perfil.`);
                }
            } catch (err) {
                console.error(`❌ Error con ${user.email}:`, err.message);
            }
        }
        console.log("\n✨ Sincronización completada.");
    } catch (error) {
        console.error("💥 Error fatal:", error.message);
    }
}

sync();
