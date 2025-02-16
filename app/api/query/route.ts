import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { filters } = await req.json();
    
    let query = supabase
      .from('hr_requests')
      .select('*');

    if (filters) {
      if (filters.startDate && filters.endDate) {
        query = query
          .gte('date', filters.startDate)
          .lte('date', filters.endDate);
      }
      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in query API:', error);
    return NextResponse.json(
      { error: 'Error processing query' },
      { status: 500 }
    );
  }
} 