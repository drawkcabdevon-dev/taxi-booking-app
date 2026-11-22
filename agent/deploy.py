"""Deploy the Waymaker taxi agent to Vertex AI Agent Engine.

Usage:
    python deploy.py

Requires env:
    AGENT_ENGINE   — existing Agent Engine resource id, OR
    GCP_PROJECT + GCP_REGION — to create/use the default engine.

This is a scaffold: it validates configuration and prints the deployment
plan. Fill in the vertexai Agent Engine deploy call once the GCP project
and engine resource are confirmed (see DonsRental's agent/deploy.py for
the reference pattern).
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()


def main() -> int:
    agent_engine = os.environ.get("AGENT_ENGINE", "")
    project = os.environ.get("GCP_PROJECT", "")
    region = os.environ.get("GCP_REGION", "us-central1")

    if not agent_engine and not project:
        print(
            "Set AGENT_ENGINE (existing engine resource) or GCP_PROJECT "
            "before deploying.",
            file=sys.stderr,
        )
        return 1

    print("Waymaker taxi agent deployment plan")
    print(f"  Agent Engine: {agent_engine or '(new, in project ' + project + ')'}")
    print(f"  Region: {region}")
    print(f"  API base: {os.environ.get('TAXI_API_BASE', 'http://localhost:8000/api')}")
    print()
    print("TODO: wire the vertexai Agent Engine deploy call here once the")
    print("GCP project and engine resource are confirmed. Nothing was deployed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
