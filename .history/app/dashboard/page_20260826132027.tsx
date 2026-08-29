import React from 'react'; // ← この1行を追加

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// ...以下既存のコード