"""
Configuration settings for AML Detection Engine
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    app_name: str = "AML Detection Engine"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    workers: int = 1
    
    # Detection Thresholds
    cycle_min_length: int = 3
    cycle_max_length: int = 5
    fan_window_hours: int = 72
    velocity_threshold_minutes: int = 30
    high_risk_threshold: float = 60.0
    
    # Risk Scoring Weights (must sum to 1.0)
    weight_cycle: float = 0.25
    weight_velocity: float = 0.20
    weight_fan: float = 0.20
    weight_pass_through: float = 0.20
    weight_propagation: float = 0.15
    
    # PageRank Parameters
    pagerank_alpha: float = 0.85
    pagerank_max_iter: int = 100
    hop_decay_rate: float = 0.5
    
    # False Positive Reduction
    merchant_diversity_threshold: float = 3.0
    merchant_degree_threshold: int = 20
    payroll_degree_threshold: int = 15
    business_hub_degree_threshold: int = 30
    
    # Performance
    max_file_size_mb: int = 100
    processing_timeout_seconds: int = 300
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
