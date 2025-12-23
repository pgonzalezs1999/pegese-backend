const { createClient } = require("@supabase/supabase-js")
const supabaseUrl = "https://npqhczntjddwvtreoghl.supabase.co";
const supabaseKey = "sb_secret_HC_LXUFl7JLvm5bVNvsObA_Wz_RfZJe";
const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = {
    supabase
}