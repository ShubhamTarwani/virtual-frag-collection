export default function SuspendedPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-6xl">🔒</div>
        <h1 className="text-3xl font-bold font-serif text-foreground">Account Suspended</h1>
        <p className="text-muted text-lg">
          Your account has been suspended by an administrator. If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  )
}
