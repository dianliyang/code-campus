import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import CourseList from "@/components/home/CourseList";

const searchParams = new URLSearchParams("");
const fetchMock = vi.fn();
const observerInstances: MockIntersectionObserver[] = [];

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }

  observe() {}

  disconnect() {}

  unobserve() {}

  takeRecords() {
    return [];
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
    void prefetch;
    return (
      <a href={typeof href === "string" ? href : "#"} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/components/common/AppToastProvider", () => ({
  useAppToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock("@/actions/courses", () => ({
  toggleCourseEnrollmentAction: vi.fn(),
}));

vi.mock("@/components/home/CourseListHeader", () => ({
  default: () => <div data-testid="course-list-header" />,
}));

function stubScrollMetrics(element: HTMLElement, metrics: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    writable: true,
    value: metrics.scrollTop,
  });
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: metrics.clientHeight,
  });
}

describe("CourseList infinite scroll", () => {
  beforeEach(() => {
    observerInstances.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    window.localStorage.setItem("courseViewMode", "list");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("does not request the same next page more than once while a load is already in flight", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve as (value: Response) => void;
        }),
    );

    const view = render(
      <CourseList
        initialCourses={[
          {
            id: 1,
            title: "Algorithms",
            courseCode: "CS-101",
            university: "Test U",
            url: "https://example.com/1",
            description: "Intro course",
            popularity: 1,
            isHidden: false,
            fields: [],
            semesters: ["Spring 2026"],
          },
        ]}
        totalPages={3}
        currentPage={1}
        perPage={20}
        initialEnrolledIds={[]}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    await waitFor(() => {
      expect(observerInstances.length).toBeGreaterThan(0);
    });

    const scrollContainer = view.getAllByTestId("course-scroll-container")[0];
    stubScrollMetrics(scrollContainer, {
      scrollTop: 800,
      scrollHeight: 1200,
      clientHeight: 300,
    });

    await act(async () => {
      fireEvent.scroll(scrollContainer);
      observerInstances[0].trigger(true);
      observerInstances[0].trigger(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/courses?page=2&size=20&q=&sort=title&enrolled=false&universities=&levels=&semesters=");

    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 2,
              title: "Data Structures",
              courseCode: "CS-102",
              university: "Test U",
              url: "https://example.com/2",
              description: "Second course",
              popularity: 1,
              isHidden: false,
              fields: [],
              semesters: ["Spring 2026"],
            },
          ],
        }),
      } as Response);
    });
  });

  test("does not auto-request every remaining page after the first append while the sentinel stays visible", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 2,
              title: "Data Structures",
              courseCode: "CS-102",
              university: "Test U",
              url: "https://example.com/2",
              description: "Second course",
              popularity: 1,
              isHidden: false,
              fields: [],
              semesters: ["Spring 2026"],
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response);

    const view = render(
      <CourseList
        initialCourses={[
          {
            id: 1,
            title: "Algorithms",
            courseCode: "CS-101",
            university: "Test U",
            url: "https://example.com/1",
            description: "Intro course",
            popularity: 1,
            isHidden: false,
            fields: [],
            semesters: ["Spring 2026"],
          },
        ]}
        totalPages={3}
        currentPage={1}
        perPage={20}
        initialEnrolledIds={[]}
        dict={{} as never}
        filterUniversities={[]}
        filterSemesters={[]}
      />,
    );

    await waitFor(() => {
      expect(observerInstances.length).toBeGreaterThan(0);
    });

    const scrollContainer = view.getAllByTestId("course-scroll-container")[0];
    stubScrollMetrics(scrollContainer, {
      scrollTop: 800,
      scrollHeight: 1200,
      clientHeight: 300,
    });

    await act(async () => {
      fireEvent.scroll(scrollContainer);
      observerInstances[0].trigger(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(view.getByText("Data Structures")).toBeDefined();
    });

    await act(async () => {
      observerInstances[0].trigger(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      observerInstances[0].trigger(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
