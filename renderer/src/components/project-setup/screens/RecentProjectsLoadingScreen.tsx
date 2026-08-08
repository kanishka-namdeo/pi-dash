export function RecentProjectsLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-[560px] space-y-6">
        <h1 className="text-3xl font-bold text-center">Recent Projects</h1>
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-card border border-border rounded-lg space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    </div>
  );
}
