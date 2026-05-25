import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vutolpgqwdnrzsfigccb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1dG9scGdxd2RucnpzZmlnY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjksImV4cCI6MjA5MzcyODE2OX0.fJf7rHwBec9FpdB3nut4vYVItK5IasQ1JQUaWAIzKU4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
