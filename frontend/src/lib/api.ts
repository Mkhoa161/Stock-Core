class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, { error, message }: { error: string; message: string }) {
    super(message);
    this.status = status;
    this.code = error;
  }
}

const baseUrl =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:3000";

/**
 * Handle a response from fetch to the API
 */
const handleResponse = async (response: Response) => {
  if (response.ok) {
    return response.status === 204 ? {} : await response.json();
  } else {
    let error;
    try {
      error = await response.json();
    } catch {
      error = { error: "unknown", message: response.statusText };
    }
    if (error.detail) {
      throw new ApiError(response.status, {
        error: "validation",
        message: JSON.stringify(error.detail),
      });
    } else {
      throw new ApiError(response.status, error);
    }
  }
};

/**
 * Perform a fetch with JSON data in the body.
 * Only uses cookies for authentication (no Authorization header).
 */
const jsonRequest = async (url: string, method: string, data?: unknown) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const response = await fetch(baseUrl + url, {
    headers,
    method,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // cookies sent automatically
  });
  return await handleResponse(response);
};

/**
 * Perform a fetch with form data in the body.
 */
const formRequest = async (url: string, method: string, data: Record<string, string>) => {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  const response = await fetch(baseUrl + url, {
    headers,
    method,
    body: new URLSearchParams(data),
    credentials: "include",
  });
  return await handleResponse(response);
};

/**
 * Perform a GET request with optional query parameters.
 */
const get = async (url: string, queryData?: Record<string, string>) => {
  let query = "";
  if (queryData && Object.keys(queryData).length > 0) {
    query = `?${new URLSearchParams(queryData)}`;
  }
  const response = await fetch(baseUrl + url + query, {
    credentials: "include",
  });
  return await handleResponse(response);
};

/**
 * Perform a PUT request with JSON data in the body.
 */
const put = async (url: string, jsonData: unknown) => jsonRequest(url, "PUT", jsonData);

/**
 * Perform a PUT request with form data in the body.
 */
const putForm = async (url: string, formData: Record<string, string>) =>
  formRequest(url, "PUT", formData);

/**
 * Perform a POST request with JSON data in the body.
 */
const post = async (url: string, jsonData?: unknown) => jsonRequest(url, "POST", jsonData);

/**
 * Perform a POST request with form data in the body.
 */
const postForm = async (url: string, formData: Record<string, string>) =>
  formRequest(url, "POST", formData);

/**
 * Perform a DELETE request.
 */
const del = async (url: string) => {
  const response = await fetch(baseUrl + url, {
    method: "DELETE",
    credentials: "include",
  });
  return await handleResponse(response);
};

const api = { get, put, post, putForm, postForm, del };
export default api;