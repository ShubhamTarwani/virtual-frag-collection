// Test auth specifically (not just REST)
import { createClient } from '@supabase/supabase-js';

const url = 'https://zdtcrwufnhvosemdmyfh.supabase.co';
const key = 'sb_publishable_50x6n7zzP0VLC2CUgViQnw_sDONn65g';

const supabase = createClient(url, key);

// Try to reach auth endpoint
const { data, error } = await supabase.auth.getSession();
console.log('Auth test - error:', error);
console.log('Auth test - data:', data);

// Also try REST
const { data: perfumes, error: restErr } = await supabase.from('perfumes').select('id').limit(1);
console.log('REST test - error:', restErr);
console.log('REST test - data:', perfumes);
