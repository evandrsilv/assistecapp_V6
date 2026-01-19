import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://anpqqsjrubqjndbijinn.supabase.co'
// IMPORTANT: Replace with your anon key. DO NOT use the service_role key.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFucHFxc2pydWJxam5kYmlqaW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTIxMTYsImV4cCI6MjA4MTM4ODExNn0.qejlYdwegKmOnSDwCWgnFHTDYpnj5yfOx9zwcF9hzZA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
