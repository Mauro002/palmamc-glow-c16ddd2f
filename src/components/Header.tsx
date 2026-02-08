import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-2xl font-heading font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              Elden<span className="text-primary">MC</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium">
              Caratteristiche
            </a>
            <a href="#community" className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium">
              Community
            </a>
            <a href="#discord" className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium">
              Discord
            </a>
            <a href="#store" className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium">
              Store
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2">
                    <User size={18} />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer">
                    <LogOut size={16} />
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth">Accedi</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-foreground p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 flex flex-col gap-4 animate-fade-in">
            <a 
              href="#features" 
              className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Caratteristiche
            </a>
            <a 
              href="#community" 
              className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Community
            </a>
            <a 
              href="#discord" 
              className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Discord
            </a>
            <a 
              href="#store" 
              className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Store
            </a>
            {user ? (
              <Button variant="outline" className="w-full mt-2" onClick={signOut}>
                <LogOut size={16} className="mr-2" />
                Esci
              </Button>
            ) : (
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link to="/auth">Accedi</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
