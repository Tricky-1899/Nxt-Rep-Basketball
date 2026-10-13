#!/usr/bin/env python3
"""Site checks for the Nxt Rep Basketball static site.

Runs on every pull request (see .github/workflows/site-checks.yml) and locally:
    python3 .github/scripts/check_site.py

Checks every HTML page for:
  - internal links that point to a page or #section that doesn't exist
  - images, icons, stylesheets and scripts that are missing
  - links written as something.html (the site uses clean URLs)
  - a <title>, meta description, viewport tag and favicon
  - duplicate element ids
Also checks that sitemap.xml lists only pages that exist.
Uses only the Python standard library.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
PAGES = sorted(p for p in ROOT.glob("*.html"))
errors, warnings = [], []


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []          # (attr, value, line)
        self.ids = []
        self.title = False
        self.description = False
        self.viewport = False
        self.icon = False
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if "id" in a and a["id"]:
            self.ids.append(a["id"])
        for attr in ("href", "src"):
            if a.get(attr):
                self.refs.append((tag, attr, a[attr], line))
        if tag == "title":
            self._in_title = True
        if tag == "meta" and a.get("name") == "description" and a.get("content", "").strip():
            self.description = True
        if tag == "meta" and a.get("name") == "viewport":
            self.viewport = True
        if tag == "link" and "icon" in (a.get("rel") or ""):
            self.icon = True

    def handle_data(self, data):
        if self._in_title and data.strip():
            self.title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False


def resolve_page(path):
    """Map a clean URL path to the HTML file Vercel would serve."""
    path = path.rstrip("/") or "/"
    if path == "/":
        return ROOT / "index.html"
    candidate = ROOT / path.lstrip("/")
    if candidate.suffix:
        return candidate
    return candidate.with_suffix(".html")


def main():
    if not PAGES:
        print("No HTML pages found.")
        return 1

    cfg = json.loads((ROOT / "vercel.json").read_text())
    if not cfg.get("cleanUrls"):
        errors.append('vercel.json: "cleanUrls": true is missing (internal links rely on it)')

    parsed = {}
    for page in PAGES:
        p = PageParser()
        p.feed(page.read_text(encoding="utf-8"))
        parsed[page] = p

    for page, p in parsed.items():
        name = page.name
        if not p.title:
            errors.append(f"{name}: missing <title>")
        if not p.description:
            warnings.append(f"{name}: missing meta description (hurts Google listing)")
        if not p.viewport:
            errors.append(f"{name}: missing viewport meta tag (breaks mobile layout)")
        if not p.icon:
            warnings.append(f"{name}: no favicon <link>")
        dupes = {i for i in p.ids if p.ids.count(i) > 1}
        for d in sorted(dupes):
            errors.append(f"{name}: duplicate id '{d}'")

        for tag, attr, value, line in p.refs:
            where = f"{name}:{line}"
            if value.startswith(("mailto:", "tel:", "data:", "javascript:")):
                continue
            url = urlparse(value)
            if url.scheme in ("http", "https") or value.startswith("//"):
                continue  # external; checked by the weekly health check
            if value == "#":
                if tag == "a":
                    warnings.append(f"{where}: placeholder link href=\"#\" (e.g. Instagram) goes nowhere")
                continue

            path, frag = url.path, url.fragment
            if path.endswith(".html") and tag == "a":
                errors.append(f"{where}: link to '{value}' uses .html; use the clean URL instead")

            target = page if not path else (resolve_page(path) if path.startswith("/") else (page.parent / path))
            if not target.exists():
                errors.append(f"{where}: {attr}=\"{value}\" points to a file that doesn't exist")
                continue
            if frag and target.suffix == ".html":
                target_page = parsed.get(target.resolve())
                if target_page is not None and frag not in target_page.ids:
                    errors.append(f"{where}: link to '{value}' but #{frag} doesn't exist on {target.name}")

    sitemap = ROOT / "sitemap.xml"
    if sitemap.exists():
        for loc in re.findall(r"<loc>(.*?)</loc>", sitemap.read_text()):
            path = urlparse(loc).path
            if path.endswith(".html"):
                errors.append(f"sitemap.xml: {loc} uses .html; use the clean URL")
            if not resolve_page(path).exists():
                errors.append(f"sitemap.xml: {loc} has no matching page")
        listed = {resolve_page(urlparse(l).path).name for l in re.findall(r"<loc>(.*?)</loc>", sitemap.read_text())}
        for page in PAGES:
            if page.name not in listed:
                warnings.append(f"sitemap.xml: {page.name} is not listed")
    else:
        warnings.append("sitemap.xml is missing")

    print(f"Checked {len(PAGES)} pages.")
    for w in warnings:
        print(f"WARNING  {w}")
    for e in errors:
        print(f"ERROR    {e}")
    if errors:
        print(f"\n{len(errors)} error(s). Fix these before merging.")
        return 1
    print("\nAll checks passed." + (f" ({len(warnings)} warning(s))" if warnings else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
