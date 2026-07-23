"""
ai_service/main.py
FastAPI AI Microservice — Realtime Wave Observer

Responsibilities:
  - Receive raw wave data batches from Node.js backend
  - Run signal processing (SciPy) and AI inference (PyTorch)
  - Return prediction results via HTTP JSON response

Endpoints:
  GET  /health       → Health check (used by Electron to verify service is up)
  POST /predict      → Main inference endpoint
  POST /process      → Signal processing only (FFT, filtering)
"""

from __future__ import annotations

import time
import logging
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import signal as scipy_signal

# ─── Logging ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("ai_service")

# ─── App Lifespan (startup / shutdown hooks) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model on startup, release resources on shutdown."""
    logger.info("AI Service starting up…")

    # TODO (Mai): Load your trained PyTorch model here
    # Example:
    #   import torch
    #   app.state.model = torch.load("models/wave_predictor.pt", map_location="cpu")
    #   app.state.model.eval()
    app.state.model = None   # placeholder until model is ready
    app.state.startup_time = time.time()

    logger.info("AI Service ready ✓")
    yield

    logger.info("AI Service shutting down…")
    # Release GPU/CPU resources if needed
    app.state.model = None


# ─── FastAPI App ──────────────────────────────────────────────────────────
app = FastAPI(
    title="Wave Observer — AI Microservice",
    description="Signal processing and ML inference for realtime wave data (10 Hz)",
    version="0.1.0",
    lifespan=lifespan,
)

# ─── CORS (allow requests from Electron / Node.js localhost) ──────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────

class WaveBatch(BaseModel):
    """A batch of raw wave samples sent by the Node.js backend."""
    timestamp_start: float = Field(..., description="Unix timestamp of the first sample (seconds)")
    sample_rate_hz: float  = Field(10.0, description="Sampling rate in Hz (default 10)")
    samples: list[float]   = Field(..., min_length=1, description="Raw wave height values (metres)")
    sensor_id: str         = Field("sensor_01", description="Source sensor identifier")


class PredictRequest(BaseModel):
    batch: WaveBatch
    features: dict[str, Any] = Field(default_factory=dict, description="Optional extra feature flags")


class SignalFeatures(BaseModel):
    significant_wave_height: float   # H_s (metres)
    peak_period: float               # T_p (seconds)
    mean_period: float               # T_m (seconds)
    dominant_frequency: float        # Hz
    rms_amplitude: float


class PredictResponse(BaseModel):
    sensor_id: str
    timestamp_start: float
    processing_time_ms: float
    signal_features: SignalFeatures
    prediction: dict[str, Any]      # AI model output (flexible until model finalised)
    model_loaded: bool


# ─── Signal Processing Helpers ────────────────────────────────────────────

def extract_signal_features(samples: list[float], fs: float) -> SignalFeatures:
    """
    Extract standard oceanographic signal features from a batch of wave samples.

    Args:
        samples: Raw wave height values (metres)
        fs:      Sampling frequency in Hz

    Returns:
        SignalFeatures with H_s, T_p, T_m, dominant frequency, RMS amplitude
    """
    arr = np.array(samples, dtype=np.float64)
    n   = len(arr)

    # ── RMS amplitude ───────────────────────────────────────────────────
    rms = float(np.sqrt(np.mean(arr ** 2)))

    # ── Significant wave height (H_s ≈ 4 × σ for zero-mean signal) ─────
    arr_zero_mean = arr - arr.mean()
    h_s = float(4.0 * np.std(arr_zero_mean))

    # ── Power Spectral Density via Welch's method ───────────────────────
    nperseg = min(256, n)
    freqs, psd = scipy_signal.welch(arr_zero_mean, fs=fs, nperseg=nperseg)

    # Avoid DC component (freq = 0)
    nonzero = freqs > 0
    freqs_nz = freqs[nonzero]
    psd_nz   = psd[nonzero]

    dominant_freq = float(freqs_nz[np.argmax(psd_nz)]) if len(freqs_nz) > 0 else 0.0
    peak_period   = float(1.0 / dominant_freq)          if dominant_freq > 0  else 0.0

    # ── Mean zero-crossing period ────────────────────────────────────────
    # T_m = m0 / m2  (spectral moments)
    df = freqs_nz[1] - freqs_nz[0] if len(freqs_nz) > 1 else 1.0
    m0 = float(np.trapz(psd_nz, dx=df))
    m2 = float(np.trapz(psd_nz * (freqs_nz ** 2), dx=df))
    mean_period = float(np.sqrt(m0 / m2)) if m2 > 0 else 0.0

    return SignalFeatures(
        significant_wave_height=h_s,
        peak_period=peak_period,
        mean_period=mean_period,
        dominant_frequency=dominant_freq,
        rms_amplitude=rms,
    )


# ─── Endpoints ────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
async def health_check(request: Request):
    """
    Returns 200 OK when the service is running.
    Used by Electron main.js to verify the AI service is ready before
    opening the BrowserWindow.
    """
    uptime = time.time() - request.app.state.startup_time
    return {
        "status": "ok",
        "uptime_seconds": round(uptime, 2),
        "model_loaded": request.app.state.model is not None,
    }


@app.post("/predict", response_model=PredictResponse, summary="Run AI inference on wave batch")
async def predict(payload: PredictRequest, request: Request):
    """
    Main inference endpoint.

    1. Receives a batch of raw wave samples from Node.js.
    2. Extracts signal features (SciPy).
    3. Runs AI model inference (PyTorch) — placeholder until Mai's model is ready.
    4. Returns structured prediction results.
    """
    t_start = time.perf_counter()

    # ── Signal processing ────────────────────────────────────────────────
    try:
        features = extract_signal_features(
            payload.batch.samples,
            payload.batch.sample_rate_hz,
        )
    except Exception as exc:
        logger.exception("Signal processing failed")
        raise HTTPException(status_code=422, detail=f"Signal processing error: {exc}") from exc

    # ── AI Inference ─────────────────────────────────────────────────────
    model = request.app.state.model
    prediction: dict[str, Any] = {}

    if model is not None:
        # TODO (Mai): Replace with actual model inference
        # Example:
        #   import torch
        #   input_tensor = torch.tensor([...features...], dtype=torch.float32)
        #   with torch.no_grad():
        #       output = model(input_tensor)
        #   prediction = {"wave_class": int(output.argmax()), "confidence": float(output.max())}
        pass
    else:
        # Return rule-based placeholder until the model is trained
        prediction = {
            "wave_class": "moderate" if features.significant_wave_height < 2.0 else "high",
            "significant_wave_height_m": round(features.significant_wave_height, 3),
            "alert": features.significant_wave_height > 3.0,
            "note": "Model not loaded — rule-based fallback active",
        }

    processing_ms = (time.perf_counter() - t_start) * 1000
    logger.info(
        "Predicted sensor=%s H_s=%.2fm T_p=%.2fs in %.1fms",
        payload.batch.sensor_id,
        features.significant_wave_height,
        features.peak_period,
        processing_ms,
    )

    return PredictResponse(
        sensor_id=payload.batch.sensor_id,
        timestamp_start=payload.batch.timestamp_start,
        processing_time_ms=round(processing_ms, 2),
        signal_features=features,
        prediction=prediction,
        model_loaded=model is not None,
    )


@app.post("/process", response_model=SignalFeatures, summary="Signal processing only (no AI)")
async def process_signal(batch: WaveBatch):
    """
    Lightweight endpoint for signal processing without AI inference.
    Useful for the frontend dashboard to display spectral features in realtime.
    """
    try:
        return extract_signal_features(batch.samples, batch.sample_rate_hz)
    except Exception as exc:
        logger.exception("Signal processing failed")
        raise HTTPException(status_code=422, detail=str(exc)) from exc
