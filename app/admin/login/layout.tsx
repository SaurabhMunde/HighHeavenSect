export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-wuxia-mountains bg-grain bg-wuxia-radial px-4 py-10">
      {children}
    </div>
  );
}
