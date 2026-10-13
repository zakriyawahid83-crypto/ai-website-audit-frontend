export type Validation = { status: "empty" | "invalid" | "private" | "checking" | "valid"; message: string };
export type AuditStepState = "done" | "active" | "waiting";
export type ToastTone = "success" | "error" | "info";

export interface AuditStep {
  title: string;
  description: string;
}

export interface Report {
  id: string;
  domain: string;
  date: string;
  pages: number | null;
  score: number | null;
  status: "completed" | "failed";
  action: string;
  error?: string;
}

export interface Audit {
  status: "running" | "complete";
  id: string;
  domain: string;
  progress: number;
  step: number;
  pagesFound: number;
}

export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

export const auditCategories: string[] = [
  "SEO",
  "Performance",
  "Accessibility",
  "Content",
  "Mobile usability",
  "Security basics",
];

export const auditSteps: AuditStep[] = [
  { title: "Validate the address", description: "HTTPS reachable, public address" },
  { title: "Find and read pages", description: "31 of 48 pages found so far" },
  { title: "Measure speed and performance", description: "Loading metrics and optimisation opportunities" },
  { title: "Check accessibility, mobile and security", description: "Alt text, form labels, viewport, HTTPS and security headers" },
  { title: "Write the AI report", description: "Plain-language explanations tied to what was found" },
];

export const initialReports: Report[] = [
  { id: "0042", domain: "example-store.com", date: "9 Oct 2026", pages: 48, score: 72, status: "completed", action: "Open report" },
  { id: "0041", domain: "example-store.com", date: "2 Oct 2026", pages: 47, score: 70, status: "completed", action: "Compare" },
  { id: "0040", domain: "example-store.com", date: "25 Sep 2026", pages: 47, score: 68, status: "completed", action: "Compare" },
  { id: "0036", domain: "journal.example-store.com", date: "28 Aug 2026", pages: 19, score: 81, status: "completed", action: "Open report" },
  { id: "0035", domain: "old-shop.example.com", date: "21 Aug 2026", pages: null, score: null, status: "failed", error: "The site did not respond within 30 seconds", action: "Try again" },
];
