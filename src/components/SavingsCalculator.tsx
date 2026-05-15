import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  prefix?: string;
  onChange: (value: number) => void;
}

const SliderInput = ({ label, value, min, max, step, unit, prefix = "", onChange }: SliderInputProps) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-paper/70 text-sm font-medium">{label}</span>
        <span className="text-paper font-semibold">
          {prefix}{value.toLocaleString()}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-paper/10 rounded-full appearance-none cursor-pointer slider-input"
          style={{
            background: `linear-gradient(to right, hsl(var(--gold)) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%)`
          }}
        />
      </div>
    </div>
  );
};

const currencies = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
];

const SavingsCalculator = () => {
  const [currency, setCurrency] = useState(currencies[0]);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Slider values
  const [recruiterRate, setRecruiterRate] = useState(50);
  const [numRecruiters, setNumRecruiters] = useState(5);
  const [screeningsPerMonth, setScreeningsPerMonth] = useState(200);
  const [avgTimePerScreening, setAvgTimePerScreening] = useState(30);
  const [efficiencyImprovement, setEfficiencyImprovement] = useState(60);

  // Calculated savings
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [animatedSavings, setAnimatedSavings] = useState(0);

  // Calculate savings whenever inputs change
  useEffect(() => {
    // Time saved per screening (in hours)
    const timeSavedPerScreening = (avgTimePerScreening / 60) * (efficiencyImprovement / 100);
    // Total time saved per month (in hours)
    const totalTimeSavedHours = screeningsPerMonth * timeSavedPerScreening;
    // Monthly savings
    const savings = totalTimeSavedHours * recruiterRate;
    setMonthlySavings(savings);
  }, [recruiterRate, numRecruiters, screeningsPerMonth, avgTimePerScreening, efficiencyImprovement]);

  // Animate the savings number
  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const increment = (monthlySavings - animatedSavings) / steps;
    let current = animatedSavings;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      setAnimatedSavings(current);

      if (step >= steps) {
        setAnimatedSavings(monthlySavings);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [monthlySavings]);

  return (
    <section className="relative bg-ink py-24">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-paper tracking-wide mb-4">
            Savings{' '}
            <span className="text-ink  bg-paper-2 from-[hsl(var(--gold))] to-[hsl(var(--gold))]">
              Calculator
            </span>
          </h2>
          <p className="text-paper/50 text-lg max-w-2xl mx-auto">
            Discover your potential savings with FunnelHQ. See how much time and money you can save on candidate screening.
          </p>
        </div>

        {/* Currency Selector */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-paper/5 border border-white/10 rounded-lg text-paper hover:bg-paper/10 transition-colors"
            >
              <span>{currency.code}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showCurrencyDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-[hsl(var(--ink))] border border-white/10 rounded-lg overflow-hidden z-10 min-w-[100px]">
                {currencies.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      setCurrency(curr);
                      setShowCurrencyDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-paper/10 transition-colors ${
                      curr.code === currency.code ? 'bg-paper/5 text-[hsl(var(--gold))]' : 'text-paper/70'
                    }`}
                  >
                    {curr.code}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calculator Card */}
        <div className="bg-[hsl(var(--ink))] border border-white/10 rounded-2xl p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Left: Sliders */}
            <div className="space-y-8">
              <SliderInput
                label="Recruiter Hourly Rate"
                value={recruiterRate}
                min={15}
                max={150}
                step={5}
                unit="/hour"
                prefix={currency.symbol}
                onChange={setRecruiterRate}
              />

              <SliderInput
                label="Number of Recruiters"
                value={numRecruiters}
                min={1}
                max={50}
                step={1}
                unit=""
                onChange={setNumRecruiters}
              />

              <SliderInput
                label="Screenings per Month"
                value={screeningsPerMonth}
                min={50}
                max={2000}
                step={50}
                unit=" per Month"
                onChange={setScreeningsPerMonth}
              />

              <SliderInput
                label="Avg Time per Screening (Manual)"
                value={avgTimePerScreening}
                min={10}
                max={60}
                step={5}
                unit=" minutes"
                onChange={setAvgTimePerScreening}
              />

              <SliderInput
                label="AI Efficiency Improvement"
                value={efficiencyImprovement}
                min={20}
                max={90}
                step={5}
                unit=" %"
                onChange={setEfficiencyImprovement}
              />
            </div>

            {/* Right: Results */}
            <div className="flex flex-col items-center justify-center text-center bg-paper-2 from-[hsl(var(--gold))]/5 via-transparent to-[hsl(var(--gold))]/5 rounded-xl p-8 border border-white/5">
              <p className="text-paper/60 text-lg mb-2">You can save up to</p>
              <div className="text-5xl md:text-6xl font-bold text-ink  bg-paper-2 from-[hsl(var(--gold))] to-[hsl(var(--gold))] mb-2">
                {currency.symbol}{Math.round(animatedSavings).toLocaleString()}
              </div>
              <p className="text-paper/60 text-lg">per month</p>

              <div className="mt-8 pt-8 border-t border-white/10 w-full">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-paper/40">Hours Saved</p>
                    <p className="text-paper font-semibold text-lg">
                      {Math.round((screeningsPerMonth * (avgTimePerScreening / 60) * (efficiencyImprovement / 100))).toLocaleString()} hrs
                    </p>
                  </div>
                  <div>
                    <p className="text-paper/40">Annual Savings</p>
                    <p className="text-paper font-semibold text-lg">
                      {currency.symbol}{Math.round(animatedSavings * 12).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8">
          <p className="text-paper/40 text-sm">
            Based on your current screening workflow. Actual savings may vary.
          </p>
        </div>
      </div>

      {/* Custom slider styles */}
      <style>{`
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: hsl(var(--gold));
          cursor: pointer;
          border: 3px solid hsl(var(--ink));
          box-shadow: 0 0 10px rgba(0, 90, 239, 0.5);
          transition: all 0.2s ease;
        }

        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(0, 90, 239, 0.7);
        }

        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: hsl(var(--gold));
          cursor: pointer;
          border: 3px solid hsl(var(--ink));
          box-shadow: 0 0 10px rgba(0, 90, 239, 0.5);
        }
      `}</style>
    </section>
  );
};

export default SavingsCalculator;
