"""
Pydantic models for RIFT 2026 AML Detection System
Strict JSON format compliance
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class Transaction(BaseModel):
    """Single transaction record"""
    transaction_id: str
    source_account: str
    destination_account: str
    amount: float
    timestamp: str  # ISO format or Unix timestamp


class SuspiciousAccount(BaseModel):
    """Detected suspicious account - RIFT compliant format"""
    account_id: str
    suspicion_score: float = Field(..., ge=0, le=100, description="Suspicion score 0-100")
    detected_patterns: List[str] = Field(..., description="List of all detected patterns")
    ring_id: Optional[str] = Field(None, description="RING_XXX if in fraud ring, null otherwise")
    is_mule: Optional[bool] = Field(None, description="True if identified as money mule")
    mule_role: Optional[str] = Field(None, description="Role in fraud ring: 'collector', 'forwarder', 'coordinator'")
    reduction_factor: Optional[float] = Field(None, description="FP reduction applied (1.0 = none)")
    fp_type: Optional[str] = Field(None, description="FP indicator: merchant, payroll, business_hub")
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": "ACC_12345",
                "suspicion_score": 87.5,
                "detected_patterns": ["cycle_length_3", "high_velocity", "fan_out"],
                "ring_id": "RING_001",
                "is_mule": True,
                "mule_role": "forwarder"
            }
        }


class FraudRing(BaseModel):
    """Detected fraud ring - RIFT compliant format"""
    ring_id: str = Field(..., description="Unique ring identifier")
    member_accounts: List[str] = Field(..., description="List of member account IDs")
    pattern_type: str = Field(..., pattern="^(cycle|smurfing|shell_chain)$", description="Type of fraud pattern")
    risk_score: float = Field(..., ge=0, le=100, description="Ring risk score 0-100")
    pattern_subtype: Optional[str] = Field(None, description="For smurfing: fan_in | fan_out")
    edges: Optional[List[Dict[str, Any]]] = Field(None, description="Per-edge {source, target, amount, timestamp_iso} for graph viz")
    temporal_metrics: Optional[Dict[str, Any]] = Field(None, description="Time span, pass-through speed, amount deviation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ring_id": "RING_001",
                "member_accounts": ["ACC_100", "ACC_200", "ACC_300"],
                "pattern_type": "cycle",
                "risk_score": 85.2
            }
        }


class DetectionSummary(BaseModel):
    """Summary statistics - RIFT compliant format"""
    total_accounts_analyzed: int = Field(..., description="Total unique accounts processed")
    suspicious_accounts_flagged: int = Field(..., description="Number of suspicious accounts flagged")
    fraud_rings_detected: int = Field(..., description="Number of fraud rings detected")
    processing_time_seconds: float = Field(..., description="Total processing time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_accounts_analyzed": 2300,
                "suspicious_accounts_flagged": 45,
                "fraud_rings_detected": 12,
                "processing_time_seconds": 18.5
            }
        }


class AMLDetectionResponse(BaseModel):
    """Complete AML detection response - Strict RIFT format"""
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
                        "detected_patterns": ["cycle_length_3", "high_velocity"],
                        "ring_id": "RING_001"
                    }
                ],
                "fraud_rings": [
                    {
                        "ring_id": "RING_001",
                        "member_accounts": ["ACC_100", "ACC_200", "ACC_300"],
                        "pattern_type": "cycle",
                        "risk_score": 85.2
                    }
                ],
                "summary": {
                    "total_accounts_analyzed": 2300,
                    "suspicious_accounts_flagged": 45,
                    "fraud_rings_detected": 12,
                    "processing_time_seconds": 18.5
                }
            }
        }
