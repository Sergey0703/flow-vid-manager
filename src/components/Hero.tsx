const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Banner Image */}
      <div className="w-full relative">
        <img
          src="/lovable-uploads/futuristic-team-banner.png"
          alt="AI MediaFlow Team - Virtual AI Professionals"
          className="w-full h-auto object-contain max-h-[50vh] md:max-h-[60vh] lg:max-h-[70vh]"
          loading="eager"
          decoding="async"
        />

        {/* Gradient Overlay with Text */}
        <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent rounded-xl shadow-lg mx-4 md:mx-8 lg:mx-16 py-3 md:py-4 border border-white/10">
              <div className="text-center max-w-3xl mx-auto px-4">
                <h1 className="text-lg md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
                  <span className="text-red-500 drop-shadow-lg">AI</span>{" "}
                  <span className="text-white drop-shadow-lg">MediaFlow:</span>
                  <br className="block sm:hidden" />
                  <span className="block mt-1 sm:mt-0 text-sm md:text-xl lg:text-2xl xl:text-3xl text-white/90 font-medium">
                    Your Partner in AI Business Integration
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer чтобы секции ниже не наезжали */}
      <div className="h-10 md:h-12 lg:h-16 bg-background"></div>
    </section>
  );
};

export default Hero;
