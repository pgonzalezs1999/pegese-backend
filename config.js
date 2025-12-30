const {
    PORT = 3000,
    SALT_ROUNDS = 10,
    JWT_SECRET = "clave-jwt-provisional-para-la-api-de-pegese-aunque-luego-la-cambiaremos",
    SUPABASE_URL = "https://npqhczntjddwvtreoghl.supabase.co",
    SUPABASE_KEY = "sb_secret_HC_LXUFl7JLvm5bVNvsObA_Wz_RfZJe",
    NODE_ENV = "local"
} = process.env;

module.exports = { 
    PORT, 
    SALT_ROUNDS, 
    JWT_SECRET, 
    SUPABASE_URL, 
    SUPABASE_KEY, 
    NODE_ENV 
};