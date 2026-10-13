export function getApiErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        const message = item?.msg || item?.message;
        const location = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
        return message ? `${location ? `${location}: ` : ""}${message}` : "";
      })
      .filter(Boolean)
      .join("; ") || fallback;
  }

  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
}
