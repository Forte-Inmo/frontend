const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN ---
const SUPABASE_URL = "https://supabase.borei.com.ar";
const SERVICE_ROLE_KEY = "TU_SERVICE_ROLE_KEY_AQUI"; // Busca esta clave en Supabase Dashboard -> Settings -> API

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function sync() {
    try {
        console.log("🚀 Iniciando sincronización de usuarios (Supabase)...");
        
        // 1. Obtener todos los usuarios de Auth
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;
        
        console.log(`Encontrados ${users.length} usuarios en Auth.`);

        for (const user of users) {
            try {
                // 2. Verificar si ya existe en public.profiles
                const { data: existing, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (!existing) {
                    // 3. Crear el perfil si no existe
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([{
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                        }]);

                    if (insertError) throw insertError;
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
