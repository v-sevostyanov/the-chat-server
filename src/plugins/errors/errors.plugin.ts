import fp from "fastify-plugin";
import { AppError } from "../../shared/errors/app-error";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type ValidationIssue = {
  instancePath?: unknown;
  dataPath?: unknown;
  message?: unknown;
  params?: unknown;
};

type PublicValidationIssue = {
  path: string;
  message: string;
};

function buildErrorResponse(
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeValidationPath(issue: ValidationIssue): string {
  const rawPath = typeof issue.instancePath === "string"
    ? issue.instancePath
    : issue.dataPath;
  const basePath = typeof rawPath === "string" && rawPath.length > 0
    ? rawPath
    : "/";

  if (!isRecord(issue.params)) {
    return basePath;
  }

  const missingProperty = issue.params.missingProperty;
  if (typeof missingProperty !== "string" || missingProperty.length === 0) {
    return basePath;
  }

  return basePath === "/" ? `/${missingProperty}` : `${basePath}/${missingProperty}`;
}

function sanitizeValidationIssue(issue: unknown): PublicValidationIssue {
  if (!isRecord(issue)) {
    return {
      path: "/",
      message: "Invalid value.",
    };
  }

  return {
    path: normalizeValidationPath(issue),
    message: typeof issue.message === "string" && issue.message.length > 0
      ? issue.message
      : "Invalid value.",
  };
}

function sanitizeValidationDetails(validation: unknown): {
  validation: PublicValidationIssue[];
} {
  const issues = Array.isArray(validation) ? validation : [];

  return {
    validation: issues.map(sanitizeValidationIssue),
  };
}

export const errorsPlugin = fp(
  async (fastify) => {
    fastify.setNotFoundHandler(async (_request, reply) => {
      return reply
        .code(404)
        .send(buildErrorResponse("NOT_FOUND", "Route does not exist."));
    });

    fastify.setErrorHandler((error, _request, reply) => {
      if (error instanceof AppError) {
        return reply
          .code(error.statusCode)
          .send(buildErrorResponse(error.code, error.message, error.details));
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "validation" in error
      ) {
        const details = sanitizeValidationDetails(
          (error as { validation?: unknown }).validation,
        );
        return reply
          .code(400)
          .send(
            buildErrorResponse(
              "VALIDATION_ERROR",
              "Request validation failed.",
              details,
            ),
          );
      }

      fastify.log.error({ err: error }, "Unhandled error");
      return reply
        .code(500)
        .send(buildErrorResponse("INTERNAL_ERROR", "Internal server error."));
    });
  },
  {
    name: "errors-plugin",
  },
);
