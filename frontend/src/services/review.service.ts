import type { ReviewActionRequest, ReviewActionResult } from "../types/pipeline";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function approveReviewSession(
  sessionId: string,
  request: ReviewActionRequest
): Promise<ReviewActionResult> {
  return sendReviewAction(sessionId, "approve", request);
}

export async function rejectReviewSession(
  sessionId: string,
  request: ReviewActionRequest
): Promise<ReviewActionResult> {
  return sendReviewAction(sessionId, "reject", request);
}

export async function requestReviewChanges(
  sessionId: string,
  request: ReviewActionRequest
): Promise<ReviewActionResult> {
  return sendReviewAction(sessionId, "request-changes", request);
}

async function sendReviewAction(
  sessionId: string,
  action: "approve" | "reject" | "request-changes",
  request: ReviewActionRequest
): Promise<ReviewActionResult> {
  const response = await fetch(`${API_BASE_URL}/pipeline/review/${sessionId}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await response.json().catch(() => null) as ReviewActionResult | null;

  if (!data) {
    return {
      success: false,
      error: {
        code: "network.invalid_response",
        message: "Backend returned an invalid review response.",
      },
    };
  }

  if (!response.ok) {
    return {
      ...data,
      success: false,
      error: data.error ?? {
        code: `http.${response.status}`,
        message: "Review action failed before the backend returned an operational decision.",
      },
    };
  }

  return data;
}
