import Image from "next/image";

const universities = [
  { name: "MIT", logo: "/mit.svg", width: 50, height: 50 },
  { name: "Stanford", logo: "/stanford.jpg", width: 50, height: 50 },
  { name: "UC Berkeley", logo: "/ucb.png", width: 50, height: 50 },
  { name: "Carnegie Mellon", logo: "/cmu.jpg", width: 50, height: 50 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UniversityLogos({ dict }: { dict: any }) {
  return (
    <div className="w-full bg-white border-b border-gray-100 py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <p className="text-center text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-12">
          {dict.label}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          {universities.map((uni) => (
            <div key={uni.name} className="relative group">
              <div className="relative h-12 w-auto flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <Image
                  src={uni.logo}
                  alt={uni.name}
                  width={uni.width}
                  height={uni.height}
                  className="object-contain h-10 w-auto mix-blend-multiply"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
