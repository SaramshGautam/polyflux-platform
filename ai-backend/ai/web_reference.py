"""
Free, no-API-key lookup of a short background reference from Wikipedia to
supplement (never replace) the course materials in a PolyFlux Assistant
answer. Always best-effort: any failure (network, no results, rate limit)
just returns None so the chat falls back to materials-only, silently.
"""

import httpx

WIKI_SEARCH_URL = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"

# Wikipedia's API asks clients to identify themselves with a descriptive
# User-Agent; an unidentified default can get silently rate-limited.
HEADERS = {"User-Agent": "PolyFlux-StudyAssistant/1.0 (https://github.com/SaramshGautam/polyflux-platform)"}


async def fetch_wikipedia_reference(query: str) -> dict | None:
    """
    Looks up the single best-matching Wikipedia article for `query` and
    returns a short extract + canonical URL, or None if nothing relevant
    turned up (or the lookup failed for any reason).
    """
    query = (query or "").strip()
    if not query:
        return None

    try:
        async with httpx.AsyncClient(timeout=6, headers=HEADERS) as client:
            search_resp = await client.get(
                WIKI_SEARCH_URL,
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "format": "json",
                    "srlimit": 1,
                },
            )
            search_resp.raise_for_status()
            results = search_resp.json().get("query", {}).get("search", [])
            if not results:
                return None
            title = results[0]["title"]

            summary_resp = await client.get(
                WIKI_SUMMARY_URL.format(title=title.replace(" ", "_"))
            )
            summary_resp.raise_for_status()
            summary = summary_resp.json()

        # Disambiguation pages and some special pages have no real extract —
        # not useful as a background reference, so treat them as a miss.
        if summary.get("type") == "disambiguation":
            return None

        extract = (summary.get("extract") or "").strip()
        url = (summary.get("content_urls") or {}).get("desktop", {}).get("page")
        if not extract or not url:
            return None

        return {
            "title": summary.get("title", title),
            # Kept short deliberately — this is background context for the
            # model to optionally draw on, not the answer itself.
            "extract": extract[:600],
            "url": url,
        }
    except Exception as e:
        print(f"[web_reference] Wikipedia lookup failed: {e}")
        return None
