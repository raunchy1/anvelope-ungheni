import AppShell from '@/components/shared/AppShell';

export default function ClientiLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
