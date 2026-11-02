import os

import pytest
from playwright.sync_api import Page, expect

BASE_URL = os.getenv("PHISHING_SIMULATOR_BASE_URL", "http://127.0.0.1:3000")


@pytest.mark.parametrize("width,height", [(390, 844), (768, 1024), (1365, 900)])
def test_training_interface_is_responsive(page: Page, width: int, height: int) -> None:
    page.set_viewport_size({"width": width, "height": height})
    page.goto(BASE_URL, wait_until="domcontentloaded")
    expect(page.locator("body")).to_be_visible()
    page.wait_for_timeout(600)
    dimensions = page.evaluate("""() => ({viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth})""")
    assert dimensions["page"] <= dimensions["viewport"] + 1, f"Horizontal overflow: {dimensions}"


def test_training_interface_has_no_uncaught_browser_errors(page: Page) -> None:
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(800)
    assert not errors, "Uncaught browser errors: " + " | ".join(errors)
