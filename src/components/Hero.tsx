import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 lg:py-32">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,200,245,.1)_50%,transparent_75%)] opacity-30"></div>
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Brand Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-card/50 px-4 py-2 text-sm backdrop-blur-sm glow-effect">
            <Zap className="h-4 w-4 text-primary" />
            <span className="gradient-text font-semibold">AI MediaFlow</span>
          </div>
          
          {/* Main Headline - Russian */}
          <h1 className="mb-6 text-4xl font-bold leading-tight lg:text-6xl">
            AI MediaFlow:{" "}
            <span className="gradient-text">
              Ваш партнер по внедрению AI в бизнес-процессы
            </span>
          </h1>
          
          {/* Subtitle - Russian */}
          <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
            Разрабатываем и внедряем индивидуальные AI-решения для автоматизации 
            вашего документооборота и повышения эффективности.
          </p>
          
          {/* English Quote */}
          <div className="mb-12 rounded-xl bg-card/30 p-6 backdrop-blur-sm">
            <blockquote className="text-lg font-medium italic lg:text-xl">
              "Every manager dreams of a loyal team that never forgets and never misses a detail. 
              Introducing our virtual team of professionals who will never let you down."
            </blockquote>
          </div>
          
          {/* CTA Button */}
          <Button size="lg" className="glow-effect group">
            Explore Our Solutions
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;