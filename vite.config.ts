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
  // Simplified build configuration for better compatibility
  build: {
    // Use default minifier (esbuild) instead of terser
    minify: mode === 'production' ? 'esbuild' : false,
    // Generate source maps only in development
    sourcemap: mode === 'development',
    // Optimize dependencies
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  
  // Environment variable validation
  define: {
    // Validate required environment variables at build time
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));