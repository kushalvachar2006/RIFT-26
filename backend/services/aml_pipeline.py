"""
AML Detection Pipeline
Orchestrates the complete detection workflow
"""

import pandas as pd
import time
import logging
from typing import Dict, List
from services import TransactionGraphEngine, PatternDetector, RiskScoringEngine
from models import SuspiciousAccount, FraudRing, DetectionSummary, AMLDetectionResponse

logger = logging.getLogger(__name__)


class AMLPipeline:
    """
    Complete AML detection pipeline orchestrator
    
    Pipeline: CSV Upload → Cleaning → Features → Graph → Detection → Scoring → Output
    """
    
    def __init__(self):
        self.graph_engine = None
        self.pattern_detector = None
        self.risk_scorer = None
    
    def process_transactions(self, df: pd.DataFrame) -> AMLDetectionResponse:
        """
        Execute complete AML detection pipeline
        
        Args:
            df: Transaction DataFrame with columns:
                [transaction_id, source_account, destination_account, amount, timestamp]
        
        Returns:
            AMLDetectionResponse with all detection results
        """
        start_time = time.time()
        
        logger.info(f"Starting AML pipeline for {len(df)} transactions")
        
        # Step 1: Clean and validate data
        cleaned_df = self._clean_data(df)
        
        if len(cleaned_df) == 0:
            raise ValueError("No valid transactions remaining after data cleaning. Please check your CSV format and data quality.")
        
        logger.info(f"Data cleaned: {len(cleaned_df)} valid transactions")
        
        # Step 1.5: Normalize column names
        cleaned_df = self._normalize_column_names(cleaned_df)
        
        # Step 2: Build graph with temporal features
        self.graph_engine = TransactionGraphEngine()
        self.graph_engine.build_graph(cleaned_df)
        
        logger.info(f"Graph built: {self.graph_engine.graph.number_of_nodes()} nodes, {self.graph_engine.graph.number_of_edges()} edges")
        
        # Step 3: Initialize detectors
        self.pattern_detector = PatternDetector(self.graph_engine)
        self.risk_scorer = RiskScoringEngine(self.graph_engine, self.pattern_detector)
        
        logger.info("Detectors initialized")
        
        # Step 4: Pattern detection
        pattern_data = self.pattern_detector.detect_all_patterns()
        
        logger.info(f"Pattern detection complete: {len(pattern_data)} accounts with patterns")
        
        # Step 5: Risk scoring and propagation
        risk_scores = self.risk_scorer.compute_risk_scores(pattern_data)
        
        # Step 6: Generate output
        response = self._generate_response(
            risk_scores,
            cleaned_df,
            time.time() - start_time
        )
        
        return response
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and validate transaction data
        
        Args:
            df: Raw transaction DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        # Make a copy
        df = df.copy()
        
        # Define column mapping for different formats
        column_mapping = {
            # Sender variations
            'sender_id': 'source_account',
            'source_account': 'source_account',
            'from_account': 'source_account',
            'sender': 'source_account',
            
            # Receiver variations  
            'receiver_id': 'destination_account',
            'destination_account': 'destination_account',
            'to_account': 'destination_account',
            'receiver': 'destination_account',
            'beneficiary': 'destination_account',
            
            # Amount variations
            'amount': 'amount',
            'value': 'amount',
            'transaction_amount': 'amount',
            'sum': 'amount',
            
            # Transaction ID variations
            'transaction_id': 'transaction_id',
            'txn_id': 'transaction_id',
            'id': 'transaction_id',
            'transaction': 'transaction_id',
            
            # Timestamp variations
            'timestamp': 'timestamp',
            'date': 'timestamp',
            'datetime': 'timestamp',
            'time': 'timestamp',
            'created_at': 'timestamp'
        }
        
        # Required columns
        required_cols = ['transaction_id', 'source_account', 'destination_account', 'amount', 'timestamp']
        
        # Check for missing columns
        missing_cols = set(required_cols) - set(df.columns)
        if missing_cols:
            # Try to map columns first
            available_cols = set(df.columns)
            mapped_cols = set()
            
            for required_col in required_cols:
                # Find mapping in our column_mapping
                for source_col, target_col in column_mapping.items():
                    if target_col == required_col and source_col in available_cols:
                        mapped_cols.add(target_col)
                        break
            
            still_missing = set(required_cols) - mapped_cols
            if still_missing:
                raise ValueError(f"Missing required columns: {still_missing}. Available columns: {list(df.columns)}")
            else:
                # Apply mapping before validation
                df = df.rename(columns=column_mapping)
        
        # Remove duplicates
        df = df.drop_duplicates(subset='transaction_id', keep='first')
        
        # Remove null values
        df = df.dropna(subset=required_cols)
        
        # Ensure amount is positive
        df = df[df['amount'] > 0]
        
        # Remove self-loops (same source and destination)
        df = df[df['source_account'] != df['destination_account']]
        
        # Convert timestamp to datetime
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        
        # Remove invalid timestamps
        df = df.dropna(subset=['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        return df
    
    def _normalize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize different CSV column formats to standard names
        
        Args:
            df: DataFrame with various column naming conventions
            
        Returns:
            DataFrame with standardized column names
        """
        df = df.copy()
        
        # Define column mapping for different formats
        column_mapping = {
            # Sender variations
            'sender_id': 'source_account',
            'source_account': 'source_account',
            'from_account': 'source_account',
            'sender': 'source_account',
            
            # Receiver variations  
            'receiver_id': 'destination_account',
            'destination_account': 'destination_account',
            'to_account': 'destination_account',
            'receiver': 'destination_account',
            'beneficiary': 'destination_account',
            
            # Amount variations
            'amount': 'amount',
            'value': 'amount',
            'transaction_amount': 'amount',
            'sum': 'amount',
            
            # Transaction ID variations
            'transaction_id': 'transaction_id',
            'txn_id': 'transaction_id',
            'id': 'transaction_id',
            'transaction': 'transaction_id',
            
            # Timestamp variations
            'timestamp': 'timestamp',
            'date': 'timestamp',
            'datetime': 'timestamp',
            'time': 'timestamp',
            'created_at': 'timestamp'
        }
        
        # Apply mapping
        df = df.rename(columns=column_mapping)
        
        logger.info(f"Normalized columns: {list(df.columns)}")
        
        return df
    
    def _generate_response(
        self,
        risk_scores: Dict[str, Dict],
        df: pd.DataFrame,
        processing_time: float
    ) -> AMLDetectionResponse:
        """
        Generate final API response
        
        Args:
            risk_scores: Computed risk scores
            df: Cleaned transaction DataFrame
            processing_time: Total processing time in seconds
            
        Returns:
            AMLDetectionResponse object
        """
        # Extract suspicious accounts
        suspicious_accounts = []
        
        def get_risk_level(score: float) -> str:
            """Determine risk level from suspicion score"""
            if score >= 80:
                return "CRITICAL"
            elif score >= 60:
                return "HIGH"
            elif score >= 40:
                return "MEDIUM"
            else:
                return "LOW"
        
        for account_id, data in risk_scores.items():
            suspicious_accounts.append(
                SuspiciousAccount(
                    account_id=account_id,
                    suspicion_score=data['suspicion_score'],
                    patterns=data['patterns'],
                    risk_level=get_risk_level(data['suspicion_score'])
                )
            )
        
        # Sort by score descending
        suspicious_accounts.sort(key=lambda x: x.suspicion_score, reverse=True)
        
        # Extract fraud rings from pattern detection
        fraud_rings = []
        
        if self.pattern_detector:
            cycles = self.pattern_detector.detect_cycles()
            
            for cycle_info in cycles:
                fraud_rings.append(
                    FraudRing(
                        ring_id=cycle_info['ring_id'],
                        accounts=cycle_info['accounts'],
                        risk_level=cycle_info['risk_level'],
                        cycle_length=cycle_info['length'],
                        total_volume=cycle_info['total_volume']
                    )
                )
        
        # Get high-risk accounts
        high_risk_accounts = self.risk_scorer.get_high_risk_accounts(
            risk_scores,
            threshold=60.0
        )
        
        # Get graph metrics
        graph_metrics = None
        if self.graph_engine:
            graph_metrics = self.graph_engine.get_graph_metrics()
        
        # Create summary
        summary = DetectionSummary(
            total_transactions=len(df),
            unique_accounts=self.graph_engine.graph.number_of_nodes(),
            rings_detected=len(fraud_rings),
            high_risk_accounts=len(high_risk_accounts),
            processing_time_seconds=round(processing_time, 2),
            graph_metrics=graph_metrics,
            suspicious_account_count=len(suspicious_accounts),
            fraud_rings_detected=len(fraud_rings)
        )
        
        # Create response
        response = AMLDetectionResponse(
            suspicious_accounts=suspicious_accounts,
            fraud_rings=fraud_rings,
            summary=summary
        )
        
        return response
