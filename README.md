# Arnav Gupta — Portfolio

Personal portfolio built to demonstrate craft: high-motion, ultra-minimal, and put together with
AI tooling in a way that doesn't look AI-generated. Live site built with a product designer's eye
for detail, applied by an engineer.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**, deployed on Vercel
- **Tailwind 4** — CSS-first tokens, no `tailwind.config.js`
- **GSAP 3** + ScrollTrigger + ScrollSmoother — the animation engine behind every scroll-tied and
  hover interaction on the site
- **cobe** — the WebGL globe in the "right now" section
- **Anthropic Claude** (Haiku) + **ElevenLabs** — the interview agent widget, detailed below
- Self-hosted fonts: Open Sauce One (display) and Raleway (secondary/body)

The actual Next.js app lives in [`site/`](site/) — that's where you `npm install` and run things.

## Sections

The homepage runs top to bottom as: an opening hero, an Experience accordion (roles pulled from a
canonical resume source), a Selected Work grid (case-study cards, one under NDA), a Stack grid
(tools grouped by category), a "desk" diorama with quick links, a "right now" globe showing a live
visitor-location + weather pairing, a Contact section with a Cal.com booking embed, and a footer.
A second page, `/how-i-work`, is a longer-form write-up of how the site's owner works day to day
with AI tooling — the honest version, including where it breaks down.

## The interview agent

A chat widget lets a visitor ask questions and get answers grounded in the site owner's actual
resume and writing, in something close to his own voice.

**How it's put together:**

- **Text in, speech out.** The visitor types; there's no microphone, no speech recognition, no
  live voice conversation. Every answer can optionally be played back as audio via a small speaker
  control next to the text — nothing plays automatically.
- **Two API calls per turn.** `/api/ask` streams a text answer from Claude Haiku, grounded by a
  system prompt built from a single canonical source of resume facts (never generated live, never
  accepted from the client — the server owns the prompt). `/api/speak` takes an answer ID (never
  raw text) and returns synthesized audio from ElevenLabs, so the speech endpoint can't be used as
  an open text-to-speech proxy for arbitrary content.
- **Two lengths, one voice.** The visible text answer runs a bit longer, tuned for reading. If the
  visitor asks for audio and the same answer is longer than what's comfortable to *listen* to, a
  short compression pass (a second, small Claude call) tightens it before it goes to speech —
  written to still sound like the same person, just more economical.
- **A written voice, not a resume read aloud.** The system prompt is tuned so answers open with the
  actual problem being solved before any tool or number gets mentioned, keep numbers to a minimum,
  and match tone to the question — a personality question can be a little funny; a compliance or
  visa question stays completely straight. The style is grounded in the site owner's own longer
  writing (the `/how-i-work` page) rather than invented from nothing.
- **Bilingual, honestly.** A language toggle switches the whole conversation between English and
  Dutch. Voice playback is English-only — synthesizing speech is metered per character on a limited
  free tier, and offering audio in a language the visitor can already read on-screen wasn't worth
  spending that budget on. The Dutch responses also carry an explicit instruction never to imply
  native fluency the site owner doesn't have.
- **Cost containment is layered, deliberately.** A signed session token, a per-visitor question cap
  that resets after a few days, a generous per-IP rate limit, and a global daily ceiling all shape
  the experience for an honest visitor. None of them are the actual safety net — that's a hard
  monthly spend cap set directly on the API provider's side, because anything enforced only in
  application code can eventually be routed around, and the in-app layers exist to keep a real
  visitor's experience smooth, not to be airtight security.
- **One character, two forms.** The little crab mascot that appears elsewhere on the site is also
  the "face" of the agent — same character, idle/thinking/speaking states shown through simple
  sprite-swapped expressions rather than a separate illustrated identity for the chat widget.

## Local development

```bash
cd site
npm install
cp .env.local.example .env.local   # fill in the three keys below
npm run dev
```

Required environment variables (see `site/.env.local.example` for the full comments):

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com) → API keys |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) → profile → API key (free tier works) |
| `AGENT_SESSION_SECRET` | any long random string — signs the agent's session tokens |

None of these are prefixed `NEXT_PUBLIC_`, so none of them ever ship to the browser.

```bash
npx tsc --noEmit   # typecheck
npm run lint        # lint
npm run build        # production build
```

## Deployment

Built for Vercel, with the project root set to `site/`. Set the three environment variables above
in the Vercel project settings before the first deploy — the interview agent's API routes will 500
without them, but the rest of the site works fine on its own.
