import { Navigation } from "./Navigation";

export const Header = () => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl">🚦</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">EasyWay</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Check live traffic at circles
              </p>
            </div>
          </div>
          <Navigation />
        </div>
      </div>
    </header>
  );
};
