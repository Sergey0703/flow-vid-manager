import { useState, useEffect } from "react";

interface ResponsiveHeroImageProps {
  className?: string;
  alt: string;
}

const ResponsiveHeroImage = ({ className = "", alt }: ResponsiveHeroImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState("");

  useEffect(() => {
    // Determine which image to load based on screen size
    const updateImageSrc = () => {
      const width = window.innerWidth;
      
      if (width >= 1024) {
        // Desktop
        setCurrentSrc("/lovable-uploads/futuristic-team-banner.png");
      } else if (width >= 768) {
        // Tablet - use desktop image but smaller
        setCurrentSrc("/lovable-uploads/futuristic-team-banner.png");
      } else {
        // Mobile - use desktop image with object-fit
        setCurrentSrc("/lovable-uploads/futuristic-team-banner.png");
      }
    };

    updateImageSrc();
    window.addEventListener('resize', updateImageSrc);
    
    return () => window.removeEventListener('resize', updateImageSrc);
  }, []);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.warn("Hero banner image failed to load, using fallback");
    setImageLoaded(false);
  };

  return (
    <div className={`absolute inset-0 ${className}`}>
      {!imageLoaded && (
        // Fallback gradient background
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 animate-pulse" />
      )}
      
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover object-center transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="eager" // Load hero image immediately
          decoding="async"
        />
      )}
      
      {/* Overlay gradients - always present */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/70 to-blue-900/80"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30"></div>
    </div>
  );
};

export default ResponsiveHeroImage;