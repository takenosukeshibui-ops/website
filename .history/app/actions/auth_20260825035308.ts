'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState: unknown, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { error: error.message }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

    if (profile?.role === 'admin') redirect('/admin')
    redirect('/dashboard')
}
