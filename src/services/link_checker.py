
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


MAX_LINKS = 50
TIMEOUT = 8.0


def check_internal_links(
    html: str,
    page_url: str,
    client: httpx.Client,
) -> list[dict]:
    """Check a limited number of same-host links for HTTP errors."""

    base = urlparse(page_url)
    issues = []
    checked_urls = set()

    soup = BeautifulSoup(html, "html.parser")

    for anchor in soup.find_all("a", href=True):
        if len(checked_urls) >= MAX_LINKS:
            break

        href = anchor["href"].strip()

        if not href or href.startswith(
            ("#", "mailto:", "tel:", "javascript:", "data:")
        ):
            continue

        target_url = urljoin(page_url, href)
        parsed_target = urlparse(target_url)

        # Only check HTTP/HTTPS links on the same hostname.
        if parsed_target.scheme not in {"http", "https"}:
            continue

        if (parsed_target.hostname or "").lower() != (
            base.hostname or ""
        ).lower():
            continue

        # Ignore fragments when identifying duplicate URLs.
        target_url = parsed_target._replace(fragment="").geturl()

        if target_url in checked_urls:
            continue

        checked_urls.add(target_url)

        try:
            response = client.get(
                target_url,
                timeout=TIMEOUT,
                follow_redirects=False,
            )

            if response.status_code >= 400:
                issues.append({
                    "page_url": page_url,
                    "category": "broken_links",
                    "title": f"Internal link returned HTTP {response.status_code}",
                    "severity": (
                        "high" if response.status_code >= 500
                        else "medium"
                    ),
                    "description": (
                        f"The internal link {target_url} returned "
                        f"HTTP {response.status_code}."
                    ),
                    "recommendation": (
                        "Verify the destination URL and repair the link "
                        "or restore the missing page."
                    ),
                    "evidence": target_url,
                })

            elif response.status_code in {301, 302, 303, 307, 308}:
                issues.append({
                    "page_url": page_url,
                    "category": "broken_links",
                    "title": "Internal link redirects",
                    "severity": "low",
                    "description": (
                        f"The link {target_url} redirects to another URL."
                    ),
                    "recommendation": (
                        "Consider linking directly to the final destination."
                    ),
                    "evidence": target_url,
                })

        except httpx.HTTPError as exc:
            issues.append({
                "page_url": page_url,
                "category": "broken_links",
                "title": "Internal link could not be checked",
                "severity": "medium",
                "description": (
                    f"The destination {target_url} could not be checked: "
                    f"{type(exc).__name__}."
                ),
                "recommendation": (
                    "Verify that the destination is reachable and "
                    "that the server responds correctly."
                ),
                "evidence": target_url,
            })

    return issues