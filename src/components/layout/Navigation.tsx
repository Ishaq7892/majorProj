import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Home, Upload, BarChart3, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { path: "/", label: "Traffic Status", icon: Home },
    { path: "/upload", label: "Upload Data", icon: Upload },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/ai-prediction", label: "AI Prediction", icon: Sparkles },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              asChild
              variant={isActive(item.path) ? "default" : "ghost"}
              size="sm"
            >
              <Link to={item.path} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">Logout</span>
          </Button>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Mobile Navigation */}
      {isOpen && (
        <nav className="absolute top-full left-0 right-0 bg-card border-b border-border md:hidden shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  asChild
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                >
                  <Link to={item.path} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
            {user && (
              <Button
                variant="ghost"
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="w-full justify-start flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            )}
          </div>
        </nav>
      )}
    </>
  );
};
