"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Course {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  url: string;
  description: string;
  popularity: number;
  timeCommitment: string;
  isHidden: boolean;
  fields: string[];
  level?: string;
  corequisites?: string;
}

interface University {
  name: string;
  count: number;
}

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(
    []
  );
  const [availableFields, setAvailableFields] = useState<{name: string, count: number}[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("size", "10");
    if (selectedUniversities.length > 0) {
      params.append("universities", selectedUniversities.join(","));
    }
    if (selectedFields.length > 0) {
      params.append("fields", selectedFields.join(","));
    }

    fetch(`/api/courses?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCourses(data.items);
        setTotalPages(data.pages);
        setTotalItems(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching courses:", err);
        setLoading(false);
      });
  }, [page, selectedUniversities, selectedFields]);

  useEffect(() => {
    fetch("/api/universities")
      .then((res) => res.json())
      .then((data) => {
        setUniversities(data);
      })
      .catch((err) => {
        console.error("Error fetching universities:", err);
      });

    fetch("/api/fields")
      .then((res) => res.json())
      .then((data) => {
        setAvailableFields(data);
      })
      .catch((err) => {
        console.error("Error fetching fields:", err);
      });
  }, []);

  const handleUniversityChange = (uni: string) => {
    setLoading(true);
    setSelectedUniversities((prev) => {
      if (prev.includes(uni)) {
        return prev.filter((u) => u !== uni);
      } else {
        return [...prev, uni];
      }
    });
    setPage(1);
  };

  const handleFieldChange = (fieldName: string) => {
    setLoading(true);
    setSelectedFields((prev) => {
      if (prev.includes(fieldName)) {
        return prev.filter((f) => f !== fieldName);
      } else {
        return [...prev, fieldName];
      }
    });
    setPage(1);
  };

  const logos: Record<string, string> = {
    mit: "/mit.svg",
    stanford: "/stanford.jpg",
    cmu: "/cmu.jpg",
    ucb: "/ucb.png",
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold tracking-tighter text-brand-dark">
                <i className="fa-solid fa-code text-brand-blue mr-2"></i>
                CodeCampus
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm font-medium text-gray-500">
              {/* University filter moved to sidebar */}
              <a href="#" className="hover:text-brand-blue">
                Fields
              </a>
              <a href="#" className="hover:text-brand-blue">
                Compare{" "}
                <span className="bg-brand-blue text-white text-xs px-2 py-0.5 rounded-full ml-1">
                  2
                </span>
              </a>
              <button className="text-gray-900 hover:text-brand-blue">
                <i className="fa-regular fa-user"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-brand-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
            Git Push Your Career.
          </h1>

          <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl flex items-center font-mono text-sm md:text-base">
            <span className="text-brand-green mr-3">user@codecampus:~$</span>
            <input
              type="text"
              placeholder="find_course --topic='Distributed Systems' --loc='Europe'"
              className="bg-transparent border-none outline-none text-gray-300 w-full placeholder-gray-600 focus:ring-0"
            />
            <span className="w-2.5 h-5 bg-brand-green cursor-blink"></span>
            <button className="ml-4 text-gray-400 hover:text-white">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>

          <div className="mt-4 flex gap-2 text-xs font-mono text-gray-400 flex-wrap">
            <span>Suggestions:</span>
            <span className="bg-gray-800 px-2 py-1 rounded cursor-pointer hover:text-white hover:bg-gray-700">
              #TinyML
            </span>
            <span className="bg-gray-800 px-2 py-1 rounded cursor-pointer hover:text-white hover:bg-gray-700">
              #Cryptography
            </span>
            <span className="bg-gray-800 px-2 py-1 rounded cursor-pointer hover:text-white hover:bg-gray-700">
              #Germany
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-8">
            {/* Universities Filter (Moved from Nav) */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">
                Universities
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scroll pr-2">
                {universities.map((university) => (
                  <label
                    key={university.name}
                    className="flex items-center text-sm text-gray-600 hover:text-brand-blue cursor-pointer group py-0.5"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded text-brand-blue focus:ring-brand-blue"
                      checked={selectedUniversities.includes(university.name)}
                      onChange={() => handleUniversityChange(university.name)}
                    />
                    <span
                      className="truncate flex-grow"
                      title={university.name.toUpperCase()}
                    >
                      {university.name.toUpperCase()}
                    </span>
                    <span className="ml-2 text-gray-400 text-xs flex-shrink-0">
                      ({university.count})
                    </span>
                  </label>
                ))}
                {universities.length === 0 && (
                  <span className="text-xs text-gray-400">
                    Loading universities...
                  </span>
                )}
              </div>
            </div>

            {/* Focus Area */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">
                Focus Area
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto custom-scroll pr-2">
                {availableFields.map((field) => (
                  <label
                    key={field.name}
                    className="flex items-center text-sm text-gray-600 hover:text-brand-blue cursor-pointer group py-0.5"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded text-brand-blue focus:ring-brand-blue"
                      checked={selectedFields.includes(field.name)}
                      onChange={() => handleFieldChange(field.name)}
                    />
                    <span className="truncate flex-grow" title={field.name}>
                      {field.name}
                    </span>
                    <span className="ml-2 text-gray-400 text-xs flex-shrink-0">
                      ({field.count})
                    </span>
                  </label>
                ))}
                {availableFields.length === 0 && (
                  <span className="text-xs text-gray-400">
                    Loading fields...
                  </span>
                )}
              </div>
            </div>

            {/* Removed: Degree Type, Location, Tuition */}
          </div>
        </aside>

        {/* Course List */}
        <main className="flex-grow space-y-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500 font-mono">
              Found {totalItems} courses matching query...
            </span>

            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded p-1 gap-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1 px-2 rounded text-xs ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-brand-blue"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="List View"
                >
                  <i className="fa-solid fa-list"></i>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1 px-2 rounded text-xs ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-brand-blue"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="Grid View"
                >
                  <i className="fa-solid fa-border-all"></i>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select className="text-sm border-none bg-transparent font-bold focus:ring-0 cursor-pointer">
                  <option>Relevance</option>
                  <option>Ranking</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-circle-notch fa-spin text-brand-blue text-3xl"></i>
              <p className="mt-4 text-gray-500 font-mono">
                Fetching courses...
              </p>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                    : "space-y-4"
                }
              >
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className={`bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200 relative group flex flex-col ${
                      viewMode === "grid" ? "h-full" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 min-w-0">
                        {/* Logo or Placeholder */}
                        {logos[course.university] ? (
                          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 relative">
                            <Image
                              src={logos[course.university]}
                              alt={course.university}
                              width={40}
                              height={40}
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 text-gray-800 flex items-center justify-center font-bold rounded uppercase text-xs flex-shrink-0">
                            {course.university.substring(0, 3)}
                          </div>
                        )}

                                                <div className="min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <h4 className="text-sm text-gray-500 font-medium truncate uppercase tracking-tight" title={course.university}>
                                                      {course.university}
                                                    </h4>
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                                                      {course.courseCode}
                                                    </span>
                                                  </div>
                                                  <h2 className="text-xl font-bold text-gray-900 mt-1 group-hover:text-brand-blue transition-colors line-clamp-2">
                                                    <a href={course.url} target="_blank" rel="noopener noreferrer" className="block" title={course.title}>
                                                      {course.title}
                                                    </a>
                                                  </h2>                          <div className="flex gap-2 mt-2 flex-wrap">
                            {course.fields?.map((field) => (
                              <span
                                key={field}
                                className="bg-brand-blue/5 text-brand-blue text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border border-brand-blue/10"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-brand-blue flex-shrink-0 ml-4">
                        <i className="fa-regular fa-bookmark fa-lg"></i>
                      </button>
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-4 flex-grow">
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {course.description ||
                          `Explore this course on ${course.university}. Click to view details and enrollment options.`}
                      </p>

                      <div className="space-y-2 text-[11px] font-mono text-gray-500 uppercase tracking-tight">
                        {course.level && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-24">Level:</span>
                            <span className="text-gray-700 font-bold">{course.level}</span>
                          </div>
                        )}
                        {course.corequisites && (
                          <div className="flex items-start gap-2">
                            <span className="text-gray-400 w-24 flex-shrink-0">Corequisites:</span>
                            <span className="text-gray-700 line-clamp-1">{course.corequisites}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-mono text-gray-500">
                      <div className="flex gap-4">
                        <span>
                          <i className="fa-solid fa-globe mr-1"></i>Remote
                        </span>
                      </div>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-blue font-bold hover:underline"
                      >
                        View Course{" "}
                        <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {courses.length > 0 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button
                    onClick={() => {
                      setLoading(true);
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setLoading(true);
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
