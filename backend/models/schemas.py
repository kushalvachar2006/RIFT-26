"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Transaction(BaseModel):
    """Single transaction record"""
    transaction_id: str
    source_account: str
    destination_account: str
    amount: float
    timestamp: str  # ISO format or Unix timestamp


class SuspiciousAccount(BaseModel):
    """Detected suspicious account"""
    account_id: str
    suspicion_score: float = Field(..., ge=0, le=100)
    patterns: List[str] = Field(default_factory=list)
    risk_level: str = Field(default="LOW", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": "ACC_12345",
                "suspicion_score": 87.5,
                "patterns": ["cycle_length_3", "high_velocity", "fan_out"],
                "risk_level": "HIGH"
            }
        }


class FraudRing(BaseModel):
    """Detected fraud ring (cycle)"""
    ring_id: str
    accounts: List[str]
    risk_level: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    cycle_length: Optional[int] = None
    total_volume: Optional[float] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "ring_id": "RING_001",
                "accounts": ["ACC_100", "ACC_200", "ACC_300"],
                "risk_level": "HIGH",
                "cycle_length": 3,
                "total_volume": 125000.50
            }
        }


class DetectionSummary(BaseModel):
    """Summary statistics"""
    total_transactions: int
    unique_accounts: int
    rings_detected: int
    high_risk_accounts: int
    processing_time_seconds: float
    graph_metrics: Optional[dict] = None
    suspicious_account_count: Optional[int] = None  # Total suspicious accounts
    fraud_rings_detected: Optional[int] = None  # Alias for rings_detected


class AMLDetectionResponse(BaseModel):
    """Complete AML detection response"""
    suspicious_accounts: List[SuspiciousAccount]
    fraud_rings: List[FraudRing]
    summary: DetectionSummary
    
    class Config:
        json_schema_extra = {
            "example": {
                "suspicious_accounts": [
                    {
                        "account_id": "ACC_12345",
                        "suspicion_score": 87.5,
                        "patterns": ["cycle_length_3", "high_velocity"]
                    }
                ],
                "fraud_rings": [
                    {
                        "ring_id": "RING_001",
                        "accounts": ["ACC_100", "ACC_200", "ACC_300"],
                        "risk_level": "HIGH",
                        "cycle_length": 3,
                        "total_volume": 125000.50
                    }
                ],
                "summary": {
                    "total_transactions": 10500,
                    "unique_accounts": 2300,
                    "rings_detected": 12,
                    "high_risk_accounts": 45,
                    "processing_time_seconds": 18.5
                }
            }
        }
