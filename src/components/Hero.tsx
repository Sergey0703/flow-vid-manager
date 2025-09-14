const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Banner Image - показывает всех персонажей */}
      <div className="w-full">
        <img 
          src="/lovable-uploads/futuristic-team-banner.png" 
          alt="AI MediaFlow Team - Virtual AI Professionals" 
          className="w-full h-auto object-contain max-h-[50vh] md:max-h-[60vh] lg:max-h-[70vh]"
          loading="eager"
          decoding="async"
        />
      </div>
      
      {/* Text Section под баннером */}
      <div className="bg-background py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-4xl mx-auto">
            <span className="text-red-500">AI</span>{" "}
            <span className="text-foreground">MediaFlow:</span>
            <br className="block sm:hidden" />
            <span className="block mt-2 sm:mt-0 text-xl md:text-3xl lg:text-4xl text-muted-foreground font-medium">
              Your Partner in AI Business Integration
            </span>
          </h1>
        </div>
      </div>
    </section>
  );
};

export default Hero;