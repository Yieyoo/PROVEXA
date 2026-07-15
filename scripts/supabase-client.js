// Supabase project connection for the PROVEXA admin panel.
// The publishable/anon key is safe to expose in client-side code by design —
// real protection comes from Row Level Security policies in Supabase, not from hiding this key.
var SUPABASE_URL = 'https://xgodruftaxlbwijmfrrj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_pG1FZMR_pEZC7lxHyVTo6Q_WIN7h3jc';
var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
