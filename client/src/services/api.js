const base = "/api/v1";

let refreshPromise;
let sessionGeneration = 0;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function resetSessionRequests() {
  sessionGeneration += 1;
}

function connectionMessage(path, method) {
  if (path === "/videos" && method === "POST") {
    return (
      "The upload connection was interrupted. " +
      "Check Creator Studio before uploading again; " +
      "your video may already have been saved."
    );
  }

  return (
    "Could not connect to HyperClip. " +
    "Check your connection and that the backend is running."
  );
}

async function send(path, options = {}) {
  const { body, ...rest } = options;
  const method = (rest.method || "GET").toUpperCase();
  const headers = new Headers(rest.headers);
  const multipart = body instanceof FormData;

  if (multipart) {
    // The browser must supply the multipart boundary.
    headers.delete("Content-Type");
  } else if (body != null) {
    headers.set("Content-Type", "application/json");
  }

  let response;

  try {
    response = await fetch(base + path, {
      ...rest,
      method,
      credentials: "include",
      headers,
      body:
        body == null
          ? undefined
          : multipart
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    if (rest.signal?.aborted || error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(connectionMessage(path, method));
  }

  let raw;

  try {
    raw = await response.text();
  } catch (error) {
    if (rest.signal?.aborted || error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(connectionMessage(path, method));
  }

  let result;

  try {
    result = JSON.parse(raw);
  } catch {
    const message =
      [502, 503, 504].includes(response.status)
        ? connectionMessage(path, method)
        : response.status === 408
          ? "The request timed out. Check Creator Studio before retrying an upload."
          : "The server returned an unreadable response. Please try again.";

    throw new ApiError(message, response.status);
  }

  if (!result || typeof result !== "object") {
    throw new ApiError(
      "The server returned an unexpected response.",
      response.status
    );
  }

  if (!response.ok || result.success === false) {
    throw new ApiError(
      result.message || "Request failed.",
      response.status
    );
  }

  return result.data;
}

export async function api(path, options = {}) {
  const { refresh = true, ...request } = options;
  const generation = sessionGeneration;

  try {
    return await send(path, request);
  } catch (error) {
    if (
      error.status !== 401 ||
      !refresh ||
      request.signal?.aborted
    ) {
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = send("/users/refresh-token", {
        method: "POST",
      }).finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
    } catch (refreshError) {
      if (
        refreshError.status === 401 &&
        generation === sessionGeneration
      ) {
        window.dispatchEvent(
          new Event("hyperclip:session-expired")
        );
      }

      throw refreshError;
    }

    if (generation !== sessionGeneration) {
      throw new ApiError(
        "Your session changed. Please try again.",
        401
      );
    }

    try {
      return await send(path, request);
    } catch (retryError) {
      if (
        retryError.status === 401 &&
        generation === sessionGeneration
      ) {
        window.dispatchEvent(
          new Event("hyperclip:session-expired")
        );
      }

      throw retryError;
    }
  }
}

export function query(values = {}) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params.set(key, value);
    }
  });

  return params.size ? "?" + params.toString() : "";
}

export const id = (value) => encodeURIComponent(value);