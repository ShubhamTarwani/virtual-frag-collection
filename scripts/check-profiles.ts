import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1].trim().replace(/['"]/g, '')
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)?.[1].trim().replace(/['"]/g, '')

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env variables missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: profiles, error: err1 } = await supabase.from('profiles').select('username, display_name')
  if (err1) {
    console.error(err1)
    return
  }
  console.log('Profiles:', profiles)

  const { data: likes, error: err2 } = await supabase.from('likes').select('id')
  if (err2) {
    console.error(err2)
    return
  }
  console.log('Total likes:', likes.length)
}

check()
