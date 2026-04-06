export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#ffffff',
      color: '#1e293b',
      minHeight: '100vh',
    }}>
      {children}
    </div>
  );
}
