import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card/30 backdrop-blur-sm border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand & Description */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold gradient-text">AI MediaFlow</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI MediaFlow — an intelligent media agency for business content and training. 
              Empowering organizations with cutting-edge AI solutions.
            </p>
          </div>
          
          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Navigation</h4>
            <nav className="flex flex-col space-y-2 text-sm">
              <a href="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </a>
              <a href="/admin" className="text-muted-foreground hover:text-primary transition-colors">
                Admin
              </a>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </a>
              <a href="#privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </nav>
          </div>
          
          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contact</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>auto2025system@gmail.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Digital Innovation Hub</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="mt-8 border-t border-border/50 pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 AI MediaFlow. All rights reserved. Powered by intelligent automation.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;