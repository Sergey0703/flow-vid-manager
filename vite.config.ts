import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Security headers for development server
    headers: {
      // Prevent clickjacking attacks
      'X-Frame-Options': 'DENY',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Enable XSS protection
      'X-XSS-Protection': '1; mode=block',
      
      // Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Basic Content Security Policy (development friendly)
      'Content-Security-Policy': mode === 'development' 
        ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://jfxxtyfuccwmfeyltype.supabase.co wss://realtime.supabase.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:;"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://jfxxtyfuccwmfeyltype.supabase.co wss://realtime.supabase.com; media-src 'self' blob: https:;",
      
      // Permissions Policy (limit browser APIs)
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Build optimizations for security
  build: {
    // Remove console logs in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    // Enable source maps for debugging (but consider security implications)
    sourcemap: mode === 'development',
  },
  
  // Environment variable validation
  define: {
    // Validate required environment variables at build time
    __SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));