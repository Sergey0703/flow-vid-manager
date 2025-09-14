const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Banner Image - показывает всех персонажей */}
      <div className="w-full relative">
        <img
          src="/lovable-uploads/futuristic-team-banner.png"
          alt="AI MediaFlow Team - Virtual AI Professionals"
          className="w-full h-auto object-contain max-h-[50vh] md:max-h-[60vh] lg:max-h-[70vh]"
          loading="eager"
          decoding="async"
        />
        {/* Overlapping Text Section с градиентным фоном */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm rounded-t-3xl md:rounded-t-[2rem] mx-4 md:mx-8 lg:mx-16 py-4 md:py-8 lg:py-12 border border-white/10">
              <div className="text-center max-w-4xl mx-auto px-4">
                <h1 className="text-lg md:text-2xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold leading-tight">
                  <span className="text-red-500 drop-shadow-lg">AI</span>{" "}
                  <span className="text-white drop-shadow-lg">MediaFlow:</span>
                  <br className="block sm:hidden" />
                  <span className="block mt-1 sm:mt-0 text-base md:text-lg lg:text-2xl xl:text-3xl 2xl:text-4xl text-white/90 font-medium">
                    Your Partner in AI Business Integration
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Spacer to accommodate overlapping text */}
      <div className="h-16 md:h-8 lg:h-12 bg-background"></div>
    </section>
  );
};

export default Hero;