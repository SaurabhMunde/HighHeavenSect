export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void bg-grain px-4">
      {children}
    </div>
  );
}
