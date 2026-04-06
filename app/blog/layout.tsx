export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-page" style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
}
