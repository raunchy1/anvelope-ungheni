'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Error Boundary]', error);
    }, [error]);

    return (
        <div style={{ 
            padding: 40, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh'
        }}>
            <h2 style={{ color: 'var(--red)', marginBottom: 16 }}>Eroare la încărcarea paginii</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
                {error.message || 'A apărut o eroare necunoscută'}
            </p>
            <button 
                onClick={reset}
                style={{
                    padding: '12px 24px',
                    background: 'var(--blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                }}
            >
                Încearcă din nou
            </button>
        </div>
    );
}
