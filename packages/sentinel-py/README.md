# AMEVA-Sentinel (Python SDK)

> **Shadow-First Automation Risk Observation & Multi-Axis Threat Telemetry Layer for Python Web Applications**  
> *Official Python SDK for FastAPI, Starlette, Flask, and Django with Edge Provider Adapters & Privacy-by-Design.*

[![PyPI version](https://img.shields.io/pypi/v/ameva-sentinel.svg?color=blue)](https://pypi.org/project/ameva-sentinel/)
[![Python versions](https://img.shields.io/pypi/pyversions/ameva-sentinel.svg)](https://pypi.org/project/ameva-sentinel/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Official Docs](https://img.shields.io/badge/docs-uno--km.vercel.app%2Fsentinel-004499)](https://uno-km.vercel.app/lib/sentinel/)

---

## ⚡ Quick Start

### 1. Installation
```bash
pip install ameva-sentinel
```

### 2. Direct Evaluation
```python
from ameva_sentinel import Sentinel

sentinel = Sentinel(mode="shadow")
headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
    "cf-ray": "8f123-ICN",
    "cf-connecting-ip": "203.0.113.195"
}
assessment = sentinel.evaluate(headers=headers, signals={"screen_hz": 60})
print(assessment.to_dict())
```
