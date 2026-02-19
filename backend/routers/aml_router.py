"""
RIFT 2026 Compliant API Router for AML Detection
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
import traceback
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from models import AMLDetectionResponse
from services.rift_aml_pipeline import RIFTAMLPipeline

_executor = ThreadPoolExecutor(max_workers=2)

logger = logging.getLogger(__name__)
router = APIRouter()

# Task 7: Security - file size limit (50MB for 10K+ transactions)
MAX_CSV_SIZE_BYTES = 50 * 1024 * 1024
MAX_CSV_ROWS = 50000


@router.post("/upload-csv", response_model=AMLDetectionResponse)
async def upload_and_detect(file: UploadFile = File(...)):
    """
    Upload CSV file and run RIFT 2026 compliant AML detection
    
    Expected CSV columns (any of these variations accepted):
    - transaction_id/txn_id/id: Unique transaction identifier
    - source_account/sender_id/from_account/sender: Source account ID
    - destination_account/receiver_id/to_account/receiver: Destination account ID
    - amount/value/transaction_amount/sum: Transaction amount (positive number)
    - timestamp/date/datetime/time/created_at: Transaction timestamp (ISO format or Unix timestamp)
    
    Returns:
        AMLDetectionResponse with strict RIFT JSON format:
        {
            "suspicious_accounts": [
                {
                    "account_id": "string",
                    "suspicion_score": float (0–100),
                    "detected_patterns": ["pattern_1", "pattern_2"],
                    "ring_id": "RING_001" (or null)
                }
            ],
            "fraud_rings": [
                {
                    "ring_id": "RING_001",
                    "member_accounts": ["ACC_1", "ACC_2"],
                    "pattern_type": "cycle" | "smurfing" | "shell_chain",
                    "risk_score": float
                }
            ],
            "summary": {
                "total_accounts_analyzed": int,
                "suspicious_accounts_flagged": int,
                "fraud_rings_detected": int,
                "processing_time_seconds": float
            }
        }
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    try:
        # Task 7: File size limit - prevent memory exhaustion
        contents = await file.read()
        if len(contents) > MAX_CSV_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum size of {MAX_CSV_SIZE_BYTES // (1024*1024)}MB"
            )
        df = pd.read_csv(io.StringIO(contents.decode('utf-8', errors='replace')), nrows=MAX_CSV_ROWS)
        
        logger.info(f"CSV loaded: {len(df)} rows, columns: {list(df.columns)}")
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="CSV file is empty")

        # Task 1: Strict schema validation - reject malformed CSV
        required_after_mapping = {'transaction_id', 'source_account', 'destination_account', 'amount', 'timestamp'}
        accepted_columns = {
            'transaction_id': ['transaction_id', 'txn_id', 'id', 'transaction'],
            'source_account': ['source_account', 'sender_id', 'from_account', 'sender'],
            'destination_account': ['destination_account', 'receiver_id', 'to_account', 'receiver', 'beneficiary'],
            'amount': ['amount', 'value', 'transaction_amount', 'sum'],
            'timestamp': ['timestamp', 'date', 'datetime', 'time', 'created_at'],
        }
        cols = set(df.columns)
        missing = []
        for req, aliases in accepted_columns.items():
            if not any(a in cols for a in aliases):
                missing.append(req)
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {missing}. Required: transaction_id, sender_id/source_account, receiver_id/destination_account, amount, timestamp"
            )
        
        # Run RIFT AML pipeline in thread pool (non-blocking for 10K+ txns)
        pipeline = RIFTAMLPipeline()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, pipeline.process_transactions, df)
        
        logger.info(f"RIFT detection complete: {len(result.suspicious_accounts)} suspicious accounts, {len(result.fraud_rings)} fraud rings")
        
        return result
    
    except pd.errors.ParserError as e:
        logger.error(f"CSV parsing error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"CSV parsing error: {str(e)}"
        )
    
    except ValueError as e:
        logger.error(f"Data validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Data validation error: {str(e)}"
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Internal processing error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal processing error: {str(e)}"
        )


@router.get("/status")
async def get_status():
    """Get RIFT AML API status"""
    return {
        "status": "operational",
        "service": "RIFT 2026 AML Detection API",
        "version": "2.0.0",
        "compliance": "RIFT 2026",
        "patterns_supported": [
            "Circular Fund Routing (Cycles)",
            "Smurfing (Fan-In Pattern)",
            "Smurfing (Fan-Out Pattern)",
            "Layered Shell Networks (Multi-hop Chains)",
            "High Velocity Fund Transfers",
            "Pass-Through / Rapid Forwarding Behavior",
            "Transaction Burst Pattern (Temporal Anomaly)",
            "Risk Propagation via Suspicious Neighbour Connections"
        ],
        "endpoints": {
            "upload": "/api/v1/upload-csv",
            "status": "/api/v1/status",
            "health": "/health"
        },
        "performance_targets": {
            "max_processing_time": "30 seconds for 10K transactions",
            "precision_target": "≥70%",
            "recall_target": "≥60%"
        }
    }
