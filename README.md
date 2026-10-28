# OPTICS LAB — free-tier AI backend starter

This variant uses OpenRouter's free-model router (`openrouter/free`) instead of a paid OpenAI API endpoint. It supports text and image input when the router can find a suitable free model. Availability, latency, capabilities, and limits can vary. Free access is not a promise of unlimited uptime or production reliability.

## Cost expectation
- Hosting: can use a free Render web service, subject to Render's free-tier limits.
- AI inference: the OpenRouter free-model router currently advertises zero-cost inference with rate limits. Free models/providers may change or be temporarily unavailable.
- Do not add credits or a payment method just to use this prototype. If a service asks you to pay, stop and choose another free option.
- Read the provider's current terms and privacy rules before uploading schoolwork or other images. Some free tiers may use submitted content to improve services.

## Deploy with Render + GitHub
1. Upload the contents of this folder to a private GitHub repository. Do not upload `.env` or any real API key.
2. In Render, create a new **Web Service** from that repository.
3. Set Build Command to `npm install`; Start Command to `npm start`; select the Free instance if available.
4. In Render → Environment, add `OPENROUTER_API_KEY` with the secret key created in your OpenRouter account. Do not put the key in HTML or commit it to GitHub.
5. Optionally add `OPENROUTER_MODEL=openrouter/free`.
6. Deploy and open the Render URL. `/api/health` should show `configured: true`.
7. Use OPTICS LAB prompt mode or image mode and test a simple question.

## Local test on a computer
1. Install Node.js 20+.
2. In this folder run `npm install`.
3. Set `OPENROUTER_API_KEY` in your shell environment, then run `npm start`.
4. Open `http://localhost:3000`.

## Safety and limits
- This is a learning prototype. AI output is a model specification, not arbitrary generated executable code.
- Verify all equations, sign conventions, and assumptions before relying on physics results.
- Free-model requests may hit rate limits or return errors. Retry later if needed.
- Do not publish an unrestricted endpoint to the public internet; this starter does not include authentication, request quotas, or abuse prevention.
