const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/lovable-uploads/futuristic-team-banner.png" 
          alt="AI Team Background" 
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/70 to-blue-900/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30"></div>
      </div>
      
      {/* Content - Only Title */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Main Headline Only */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight">
            <span className="text-red-500 drop-shadow-2xl">AI</span>{" "}
            <span className="text-white drop-shadow-2xl">MediaFlow:</span>
            <br className="block md:hidden" />
            <span className="block mt-2 md:mt-0 text-2xl md:text-4xl lg:text-5xl xl:text-6xl text-white/90 font-medium">
              Your Partner in AI Business Integration
            </span>
          </h1>
        </div>
      </div>
      
      {/* Bottom fade effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-5"></div>
    </section>
  );
};

export default Hero;