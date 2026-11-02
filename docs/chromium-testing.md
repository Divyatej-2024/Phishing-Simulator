# Phishing Simulator Chromium QA

Playwright + Chromium checks the locally hosted training interface. Tests cover initial rendering, responsive layout at mobile/tablet/desktop sizes, and uncaught JavaScript exceptions. They do not submit training responses, collect credentials, trigger campaigns, or contact third-party websites.

## Local run

Start the existing Express app with `npm install && npm start`. The app can start without a MongoDB URI for basic UI checks; the database-backed routes are not exercised.

In another terminal:

```bash
python -m pip install -r tests/browser/requirements.txt
python -m playwright install chromium
python -m pytest -q tests/browser
```

Set `PHISHING_SIMULATOR_BASE_URL` to another authorised local URL. These checks are UI smoke tests, not a security assessment or full simulation workflow test.
