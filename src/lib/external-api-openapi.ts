export const externalApiOpenApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Athena External API",
    version: "1.0.0",
    description: "External API for course retrieval, updates, and sync operations.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
    schemas: {
      ExternalSchedule: {
        type: "object",
        properties: {
          id: { type: "string", nullable: true },
          kind: { type: "string", nullable: true },
          location: { type: "string", nullable: true },
          timezone: { type: "string" },
          startDate: { type: "string", nullable: true },
          endDate: { type: "string", nullable: true },
          daysOfWeek: { type: "array", items: { type: "integer" } },
          startTime: { type: "string", nullable: true },
          endTime: { type: "string", nullable: true },
        },
      },
      ExternalAssignment: {
        type: "object",
        properties: {
          id: { type: "integer", nullable: true },
          kind: { type: "string" },
          label: { type: "string", nullable: true },
          dueOn: { type: "string", nullable: true },
          url: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          sourceSequence: { type: "string", nullable: true },
          sourceRowDate: { type: "string", nullable: true },
          updatedAt: { type: "string", nullable: true },
        },
      },
      ExternalSyllabus: {
        type: "object",
        nullable: true,
        properties: {
          sourceUrl: { type: "string", nullable: true },
          content: { nullable: true },
          schedule: { nullable: true },
          retrievedAt: { type: "string", nullable: true },
          updatedAt: { type: "string", nullable: true },
        },
      },
      Course: {
        type: "object",
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          university: { type: "string" },
          status: { type: "string", nullable: true },
          units: { nullable: true },
          credit: { type: "number", nullable: true },
          department: { type: "string", nullable: true },
          level: { type: "string", nullable: true },
          category: { type: "string", nullable: true },
          latestTerm: { type: "string", nullable: true },
          logistics: { nullable: true },
          prerequisites: { nullable: true },
          instructors: { type: "array", items: { type: "string" } },
          subdomain: { type: "string", nullable: true },
          topics: { type: "array", items: { type: "string" } },
          resources: { type: "array", items: { type: "string" } },
          desc: { type: "string", nullable: true },
          urlString: { type: "string", nullable: true },
          isEnrolled: { type: "boolean" },
          isFailed: { type: "boolean" },
          retry: { type: "integer" },
          gpa: { type: "number", nullable: true },
          score: { type: "number", nullable: true },
          assignments: { type: "array", items: { $ref: "#/components/schemas/ExternalAssignment" } },
          syllabus: { $ref: "#/components/schemas/ExternalSyllabus" },
          schedules: { type: "array", items: { $ref: "#/components/schemas/ExternalSchedule" } },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "string" },
          message: { type: "string" },
        },
        required: ["error"],
      },
      SyncPostResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          skipped: { type: "boolean" },
          reason: { type: "string", nullable: true },
          usedUserId: { type: "string" },
          course: {
            type: "object",
            properties: {
              id: { type: "integer" },
              code: { type: "string" },
              title: { type: "string" },
              university: { type: "string" },
            },
          },
          sync: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      SyncGetResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          course: {
            type: "object",
            properties: {
              id: { type: "integer" },
              code: { type: "string" },
              title: { type: "string" },
              university: { type: "string" },
            },
          },
          syncPolicy: {
            type: "object",
            properties: {
              private: { type: "boolean" },
              skip: { type: "boolean" },
              reason: { type: "string", nullable: true },
              updatedAt: { type: "string", nullable: true },
            },
          },
          resourcesCount: { type: "integer" },
          syllabusCount: { type: "integer" },
          syllabus: {
            type: "object",
            nullable: true,
            properties: {
              sourceUrl: { type: "string", nullable: true },
              retrievedAt: { type: "string", nullable: true },
              updatedAt: { type: "string", nullable: true },
            },
          },
          assignmentsCount: { type: "integer" },
          assignmentsPreview: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/api/external/courses": {
      get: {
        summary: "List enrolled courses",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    courses: { type: "array", items: { $ref: "#/components/schemas/Course" } },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "API key limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/external/courses/{course_code}": {
      get: {
        summary: "Get one enrolled course by code",
        parameters: [{ name: "course_code", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    courses: { type: "array", items: { $ref: "#/components/schemas/Course" } },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid course_code", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "API key limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      patch: {
        summary: "Partial update course fields and schedule fields",
        parameters: [{ name: "course_code", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  workload: { type: "number" },
                  resources: { type: "array", items: { type: "string" } },
                  schedules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        location: { type: "string" },
                        kind: { type: "string" },
                      },
                      required: ["id"],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Update summary returned" },
          "400": { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "API key limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Course not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/external/courses/{course_code}/sync": {
      post: {
        summary: "Trigger course sync",
        parameters: [{ name: "course_code", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  fastMode: { type: "boolean", default: true },
                  executionMode: { type: "string", enum: ["service", "local", "deterministic"], default: "service" },
                  sourceMode: { type: "string", enum: ["fresh", "existing", "auto"], default: "auto" },
                  force: { type: "boolean", default: false },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sync completed",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SyncPostResponse" } } },
          },
          "400": { description: "Invalid input", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "API key limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Course not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "502": { description: "Provider auth failure", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
      get: {
        summary: "Get course sync snapshot",
        parameters: [{ name: "course_code", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Sync snapshot returned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SyncGetResponse" } } },
          },
          "400": { description: "Invalid course_code", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "429": { description: "API key limit reached", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "404": { description: "Course not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          "500": { description: "Internal error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
  },
} as const;
