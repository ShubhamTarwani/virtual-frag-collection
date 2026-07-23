import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('perfumes').select('id, name, brand, custom_categories').limit(5)
  console.log("Error:", error)
  console.log("Data:", JSON.stringify(data, null, 2))
  
  if (data && data.length > 0) {
    console.log("Type of custom_categories:", typeof data[0].custom_categories)
    console.log("Is array?", Array.isArray(data[0].custom_categories))
  }
}
run()
