import json
import os
from pathlib import Path
from typing import Any

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai

load_dotenv()

DATA_DIR = Path(__file__).parent / "data"
SIGNALS_PATH = DATA_DIR / "signals.json"

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
SEMANTIC_WEIGHT = float(os.getenv("SEMANTIC_WEIGHT", "0.7"))
KEYWORD_WEIGHT = float(os.getenv("KEYWORD_WEIGHT", "0.3"))
MIN_MATCH_SCORE = float(os.getenv("MIN_MATCH_SCORE", "0.5"))
REASONING_TEMPERATURE = float(os.getenv("REASONING_TEMPERATURE", "0.3"))
MAX_REASONING_TOKENS = int(os.getenv("MAX_REASONING_TOKENS", "100"))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="DealFlow-AI")


class MatchRequest(BaseModel):
    startup_description: str


class EmailRequest(BaseModel):
    startup_description: str
    signal: dict
    match_score: float


def load_signals() -> list[dict[str, Any]]:
    if not SIGNALS_PATH.exists():
        return []
    with SIGNALS_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_embedding(text: str) -> list[float]:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY missing")
    result = genai.embed_content(
        model=f"models/{EMBEDDING_MODEL}",
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]


def calculate_keyword_overlap(startup_desc: str, signal_keywords: list[str]) -> float:
    startup_words = set(startup_desc.lower().split())
    keyword_words = set(" ".join(signal_keywords).lower().split())

    if not keyword_words:
        return 0.0

    matches = startup_words & keyword_words
    return len(matches) / len(keyword_words)


def generate_match_reasoning(startup_desc: str, signal: dict, score: float) -> str:
    if not GEMINI_API_KEY:
        return ""

    prompt = f"""You are an expert at matching GovTech startups to government procurement opportunities.

STARTUP:
{startup_desc}

GOVERNMENT SIGNAL:
- Category: {signal.get('category', '')}
- Title: {signal.get('title', '')}
- Description: {signal.get('description', '')}
- Budget: ${signal.get('budget', 0):,}
- Key Requirements: {', '.join(signal.get('keywords', []))}

Match Score: {score:.0%}

Task: Write exactly 2 sentences explaining why this startup matches this opportunity.

Requirements:
- Sentence 1: State the specific startup capability that addresses the government need
- Sentence 2: Mention the budget, timeline, or a stakeholder to show you understand the context
- Be concrete and specific
- No fluff or generic statements
- Maximum 50 words total
"""

    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=REASONING_TEMPERATURE,
            max_output_tokens=MAX_REASONING_TOKENS,
        ),
    )

    return response.text.strip()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/match")
def match_startup(request: MatchRequest) -> dict[str, Any]:
    signals = load_signals()
    if not signals:
        return {"matches": []}

    startup_embedding = get_embedding(request.startup_description)
    matches: list[dict[str, Any]] = []

    for signal in signals:
        signal_text = f"{signal.get('category', '')} {signal.get('title', '')} {signal.get('description', '')}"
        signal_embedding = signal.get("embedding")
        if not signal_embedding:
            signal_embedding = get_embedding(signal_text)
            signal["embedding"] = signal_embedding

        semantic_score = cosine_similarity(
            [startup_embedding],
            [signal_embedding],
        )[0][0]

        keyword_score = calculate_keyword_overlap(
            request.startup_description.lower(),
            signal.get("keywords", []),
        )

        final_score = (semantic_score * SEMANTIC_WEIGHT) + (keyword_score * KEYWORD_WEIGHT)

        if final_score >= MIN_MATCH_SCORE:
            reasoning = generate_match_reasoning(
                request.startup_description,
                signal,
                final_score,
            )
            matches.append(
                {
                    "signal": signal,
                    "score": float(final_score),
                    "reasoning": reasoning,
                }
            )

    matches.sort(key=lambda x: x["score"], reverse=True)
    return {"matches": matches[:10]}


@app.post("/email")
def generate_email(request: EmailRequest) -> dict[str, Any]:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY missing")

    signal = request.signal
    prompt = f"""Write a professional outreach email from a startup to a government contact.

FROM (Startup):
{request.startup_description}

TO (Government Contact):
{signal.get('stakeholders', ['City Official'])[0] if signal.get('stakeholders') else 'City Official'}

REGARDING (Opportunity):
- Title: {signal.get('title', '')}
- Description: {signal.get('description', '')}
- Budget: ${signal.get('budget', 0):,}
- Timeline: {signal.get('timeline', '')}
- Match Score: {request.match_score}%

TASK: Write a concise 3-paragraph email:

Paragraph 1 (Introduction):
- Reference the specific government initiative
- Explain why you're reaching out
- Mention how you learned about this (council minutes, strategic plan, etc.)

Paragraph 2 (Value Proposition):
- Highlight 2-3 specific capabilities that address their needs
- Use concrete metrics if available
- Show you understand their requirements

Paragraph 3 (Call to Action):
- Request a 30-minute introductory call
- Suggest next steps
- Provide availability

REQUIREMENTS:
- Professional but not stiff
- Specific, not generic
- Under 200 words
- No marketing fluff
- Include actual contact info (their email address)
"""

    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=float(os.getenv("EMAIL_TEMPERATURE", "0.7")),
            max_output_tokens=int(os.getenv("MAX_EMAIL_TOKENS", "400")),
        ),
    )

    email_body = response.text.strip()

    return {
        "subject": f"Re: {signal.get('title', 'Opportunity')} - Partnership Opportunity",
        "to": signal.get("stakeholders", ["City Official"])[0],
        "body": email_body,
        "preview_note": "This is a preview. Review and customize before sending.",
    }
