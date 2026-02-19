"""
Production Graph-Based AML Detection Engine
RIFT 2026 Compliant - Task 8: Clean production readiness
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from routers import aml_router

# Task 8: Ensure test files are not imported at runtime
# main.py imports only production routers - no test modules

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="Graph-Based AML Detection Engine",
    description="Production-grade money mule and fraud ring detection using graph analytics",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - Task 3: Only rift_aml_pipeline used (via aml_router)
app.include_router(aml_router.router, prefix="/api/v1", tags=["AML Detection"])


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Task 8: Validate API error handling - 400 for validation errors"""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AML Detection Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=1
    )
