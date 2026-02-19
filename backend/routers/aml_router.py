"""
API Router for AML Detection
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import traceback
import logging
from models import AMLDetectionResponse
from services.aml_pipeline import AMLPipeline

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload-csv", response_model=AMLDetectionResponse)
async def upload_and_detect(file: UploadFile = File(...)):
    """
    Upload CSV file and run AML detection
    
    Expected CSV columns:
    - transaction_id: Unique transaction identifier
    - source_account: Source account ID
    - destination_account: Destination account ID
    - amount: Transaction amount (positive number)
    - timestamp: Transaction timestamp (ISO format or Unix timestamp)
    
    Returns:
        AMLDetectionResponse with suspicious accounts, fraud rings, and summary
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="File must be a CSV file"
        )
    
    try:
        # Read CSV
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        logger.info(f"CSV loaded: {len(df)} rows, columns: {list(df.columns)}")
        
        # Validate minimum data
        if len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="CSV file is empty"
            )
        
        # Run AML pipeline
        pipeline = AMLPipeline()
        result = pipeline.process_transactions(df)
        
        logger.info(f"Detection complete: {len(result.suspicious_accounts)} suspicious accounts found")
        
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
    """Get API status"""
    return {
        "status": "operational",
        "service": "AML Detection API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/v1/upload-csv",
            "status": "/api/v1/status",
            "health": "/health"
        }
    }
