import UniversityIcon from "@/components/common/UniversityIcon";

const universities = [
  "MIT",
  "Stanford",
  "UC Berkeley",
  "CMU",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UniversityLogos({ dict }: { dict: any }) {
  return (
    <div className="w-full bg-white border-b border-gray-100 py-16 sm:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <p className="text-center text-sm text-slate-400 font-medium mb-8 sm:mb-12">
          {dict.label}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-24">
          {universities.map((uni) => (
            <div key={uni} className="relative group">
              <div className="relative h-10 sm:h-12 w-auto flex items-center justify-center transition-all duration-500 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110">
                <UniversityIcon
                  name={uni}
                  size={40}
                  className="mix-blend-multiply sm:w-[50px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
