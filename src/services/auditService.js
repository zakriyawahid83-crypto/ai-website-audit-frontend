
import api from "./api";

export const runAudit = async (websiteId) => {
  try {
    const { data } = await api.post(
      `/audits/${websiteId}`,
      null,
      { timeout: 300000 }
    );

    return data;
  } catch (error) {
    console.error("Failed to run audit.");
    console.error("HTTP status:", error.response?.status);
    console.error("Backend error:", error.response?.data);

    const detail = error.response?.data?.detail;

    const message = Array.isArray(detail)
      ? detail
          .map((item) => item.msg || JSON.stringify(item))
          .join(", ")
      : typeof detail === "string"
        ? detail
        : error.response?.data?.message ||
          error.message ||
          "An unexpected error occurred while running the audit.";

    const auditError = new Error(message);

    auditError.status = error.response?.status ?? null;
    auditError.responseData = error.response?.data ?? null;

    throw auditError;
  }
};

export const getAuditHistory = async () => {
  const { data } = await api.get("/audits/history");
  return data;
};

export const getAuditReport = async (auditId) => {
  const { data } = await api.get(`/audits/${auditId}/report`);
  return data;
};

export const getAIRecommendations = async (auditId) => {
  const { data } = await api.post(
    `/audits/${auditId}/ai-recommendations`
  );
  return data;
};

export const downloadCsvReport = async (auditId) => {
  const response = await api.get(
    `/audits/${auditId}/report.csv`,
    { responseType: "blob" }
  );

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = `audit-report-${auditId}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(blobUrl);
};

export async function downloadPdfReport(auditId) {
  const response = await api.get(
    `/audits/${auditId}/report.pdf`,
    { responseType: "blob" }
  );

  const url = window.URL.createObjectURL(
    new Blob([response.data], { type: "application/pdf" })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-${auditId}-report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}