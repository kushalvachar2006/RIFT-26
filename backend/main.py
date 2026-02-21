"""
Production Graph-Based AML Detection Engine
RIFT 2026 Compliant - Task 8: Clean production readiness
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import aml_router

# Configure production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="RIFT 2026 AML Detection API",
    description="Production-grade money mule and fraud ring detection using graph analytics",
    version="1.0.0"
)

# Load environment variables
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "https://rift-aml-frontend-eilt.onrender.com,https://localhost:3000")
NODE_ENV = os.getenv("NODE_ENV", "production")

# Parse frontend URLs for CORS
frontend_origins = [url.strip() for url in FRONTEND_URLS.split(",") if url.strip()]

# Ensure Render frontend is always allowed
if "https://rift-aml-frontend-eilt.onrender.com" not in frontend_origins:
    frontend_origins.append("https://rift-aml-frontend-eilt.onrender.com")

# Production CORS configuration using environment variables
app.add_middleware(
    CORSMiddleware,
        allow_origins=frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
)

# Include production routers only
app.include_router(aml_router.router, prefix="/api/v1", tags=["AML Detection"])

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Task 8: Validate API error handling - 400 for validation errors"""
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc), "error_type": "validation_error"}
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "RIFT 2026 AML Detection API",
        "version": "1.0.0",
        "environment": NODE_ENV,
        "frontend_origins": frontend_origins
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("WORKERS", 1))
    
    logging.info(f"Starting RIFT AML Detection API on port {port} with {workers} workers")
    logging.info(f"Frontend origins: {frontend_origins}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        reload=False  # Production: no auto-reload
    )
