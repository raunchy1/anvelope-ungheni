import { NextResponse } from 'next/server';
import { repairStockData } from '@/lib/data-repair';

export async function POST() {
    // In production, add authentication check here
    const result = await repairStockData();
    return NextResponse.json(result);
}

export async function GET() {
    return NextResponse.json({ 
        message: 'Use POST to run data repair',
        warning: 'This will modify stock data. Make sure you have a backup.'
    });
}
