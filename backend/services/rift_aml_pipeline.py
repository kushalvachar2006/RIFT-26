"""
RIFT 2026 Compliant AML Detection Pipeline
Orchestrates complete detection workflow with strict format compliance
"""

import pandas as pd
import time
import logging
from typing import Dict, List
from models import SuspiciousAccount, FraudRing, DetectionSummary, AMLDetectionResponse
from services import TransactionGraphEngine
from services.rift_pattern_detection import RIFTPatternDetector
from services.false_positive_control import FalsePositiveController

logger = logging.getLogger(__name__)


class RIFTAMLPipeline:
    """
    RIFT 2026 Compliant AML Detection Pipeline
    
    Pipeline: CSV Upload → Cleaning → Graph → 8 Pattern Detection → 
              False Positive Control → Risk Scoring → RIFT JSON Output
    """
    
    def __init__(self):
        self.graph_engine = None
        self.pattern_detector = None
        self.fp_controller = None
    
    def process_transactions(self, df: pd.DataFrame) -> AMLDetectionResponse:
        """
        Execute complete RIFT-compliant AML detection pipeline with performance logging
        
        Args:
            df: Transaction DataFrame with columns:
                [transaction_id, source_account, destination_account, amount, timestamp]
        
        Returns:
            AMLDetectionResponse with strict RIFT JSON format
        """
        total_start = time.time()
        
        logger.info(f"Starting RIFT AML pipeline for {len(df)} transactions")
        
        # Step 1: Clean and validate data
        clean_start = time.time()
        cleaned_df = self._clean_data(df)
        clean_time = time.time() - clean_start
        
        if len(cleaned_df) == 0:
            raise ValueError("No valid transactions remaining after data cleaning. Please check your CSV format and data quality.")
        
        logger.info(f"Data cleaned: {len(cleaned_df)} valid transactions ({clean_time:.3f}s)")
        
        # Step 2: Build graph with temporal features - O(E) optimized
        graph_start = time.time()
        self.graph_engine = TransactionGraphEngine()
        self.graph_engine.build_graph(cleaned_df)
        graph_build_time = time.time() - graph_start
        
        logger.info(f"Graph built: {self.graph_engine.graph.number_of_nodes()} nodes, "
                   f"{self.graph_engine.graph.number_of_edges()} edges ({graph_build_time:.3f}s)")
        logger.info(f"Graph build breakdown: edge_construction={self.graph_engine.performance_metrics['edge_construction_time']:.3f}s, "
                   f"node_attributes={self.graph_engine.performance_metrics['node_attributes_time']:.3f}s")
        
        # Step 3: Initialize RIFT-compliant detectors
        self.pattern_detector = RIFTPatternDetector(self.graph_engine)
        self.fp_controller = FalsePositiveController(self.graph_engine)
        
        logger.info("RIFT detectors initialized")
        
        # Step 4: Run all 8 pattern detection algorithms
        detection_start = time.time()
        pattern_data = self.pattern_detector.detect_all_patterns()
        detection_time = time.time() - detection_start
        logger.info(f"Pattern detection complete: {len(pattern_data)} accounts with patterns ({detection_time:.3f}s)")
        
        # Step 5: Apply false positive reduction using FalsePositiveController
        fp_start = time.time()
        self.fp_controller = FalsePositiveController(self.graph_engine)
        filtered_pattern_data = self.fp_controller.apply_false_positive_reduction(pattern_data)
        fp_time = time.time() - fp_start
        logger.info(f"False positive reduction: {len(pattern_data)} → {len(filtered_pattern_data)} accounts ({fp_time:.3f}s)")
        
        # Step 6: Generate RIFT-compliant response
        total_time = time.time() - total_start
        response = self._generate_rift_response(
            filtered_pattern_data,
            cleaned_df,
            total_time
        )
        
        logger.info(f"RIFT pipeline complete: {len(response.suspicious_accounts)} suspicious accounts, "
                   f"{len(response.fraud_rings)} fraud rings")
        logger.info(f"Performance: total={total_time:.3f}s, graph_build={graph_build_time:.3f}s, "
                   f"detection={detection_time:.3f}s, fp_reduction={fp_time:.3f}s")
        
        return response
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Minimal cleaning for performance optimization
        Only essential validation for 10K transaction requirement
        """
        # Make a copy
        df = df.copy()
        
        # Define column mapping for different formats - EXACT RIFT format preferred
        column_mapping = {
            # Exact RIFT columns (no mapping needed)
            'transaction_id': 'transaction_id',
            'source_account': 'source_account',
            'destination_account': 'destination_account',
            'amount': 'amount',
            'timestamp': 'timestamp',
            
            # Legacy variations (mapped to RIFT format)
            'sender_id': 'source_account',
            'receiver_id': 'destination_account',
            'from_account': 'source_account',
            'to_account': 'destination_account',
            'sender': 'source_account',
            'receiver': 'destination_account',
            'beneficiary': 'destination_account',
            'value': 'amount',
            'transaction_amount': 'amount',
            'sum': 'amount',
            'txn_id': 'transaction_id',
            'id': 'transaction_id',
            'transaction': 'transaction_id',
            'date': 'timestamp',
            'datetime': 'timestamp',
            'time': 'timestamp',
            'created_at': 'timestamp'
        }
        
        # Apply column mapping
        df = df.rename(columns=column_mapping)
        
        # Strict validation for exact RIFT columns
        required_cols = ['transaction_id', 'source_account', 'destination_account', 'amount', 'timestamp']
        missing_cols = set(required_cols) - set(df.columns)
        if missing_cols:
            raise ValueError(f"Missing required RIFT columns: {missing_cols}. Required format: transaction_id, source_account, destination_account, amount, timestamp")
        
        # Task 7: Input sanitization - strip whitespace, limit length
        for col in ['transaction_id', 'source_account', 'destination_account']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip().str[:256]
        # Ensure amount is numeric
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        
        # Remove duplicates (minimal cleaning for performance)
        df = df.drop_duplicates(subset='transaction_id', keep='first')
        
        # Drop invalid amounts and nulls
        df = df[df['amount'] > 0]
        df = df.dropna(subset=required_cols)
        
        # Task 7: Strict timestamp parsing - ISO/YYYY-MM-DD HH:MM:SS
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.dropna(subset=['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        return df
    
    def _generate_rift_response(
        self,
        pattern_data: Dict[str, Dict],
        df: pd.DataFrame,
        processing_time: float
    ) -> AMLDetectionResponse:
        """
        Generate RIFT-compliant JSON response
        
        Args:
            pattern_data: Pattern detection results with false positive reduction
            df: Cleaned transaction DataFrame
            processing_time: Total processing time in seconds
            
        Returns:
            AMLDetectionResponse with strict RIFT format
        """
        # Step 1: Generate suspicious accounts (sorted by score DESC)
        suspicious_accounts = []
        seen_account_ids = set()
        
        MIN_THRESHOLD = 30.0
        STRONG_PATTERNS = {'cycle_length_3', 'cycle_length_4', 'cycle_length_5', 'pass_through', 'shell_chain', 'risk_propagation'}
        
        for account_id, data in pattern_data.items():
            raw_score = data.get('suspicion_score', 0.0)
            normalized_score = min(max(float(raw_score), 0.0), 100.0)
            suspicion_score = round(normalized_score, 1)
            pats = set(data.get('detected_patterns', []))
            has_strong = bool(pats & STRONG_PATTERNS) or any(p.startswith('cycle_length_') for p in pats)
            
            if suspicion_score >= MIN_THRESHOLD or has_strong or data.get('ring_id'):  
                suspicious_accounts.append(
                    SuspiciousAccount(
                        account_id=account_id,
                        suspicion_score=suspicion_score,
                        detected_patterns=data.get('detected_patterns', []),
                        ring_id=data.get('ring_id'),
                        is_mule=data.get('is_mule', False),
                        mule_role=data.get('mule_role')
                    )
                )
                seen_account_ids.add(account_id)
        
        # Step 2: Generate fraud rings and ENSURE all cycle members are in suspicious_accounts (RIFT Fault 4)
        fraud_rings = []
        acc_by_id = {a.account_id: a for a in suspicious_accounts}
        
        if self.pattern_detector:
            cycles = getattr(self.pattern_detector, '_cached_cycles', None) or self.pattern_detector.detect_circular_fund_routing()
            
            for cycle_info in cycles:
                ring_key = cycle_info['ring_id']
                member_accounts = cycle_info['member_accounts']
                pattern_label = f"cycle_length_{len(member_accounts)}"
                
                # RIFT Fault 4: Every cycle node MUST be in suspicious_accounts with same ring_id
                for account_id in member_accounts:
                    if account_id not in seen_account_ids:
                        raw_data = self.pattern_detector.detected_patterns.get(account_id, {})
                        patterns = list(set(
                            raw_data.get('detected_patterns', []) + [pattern_label]
                        ))
                        raw_score = raw_data.get('suspicion_score', 88.0) if raw_data else 88.0
                        raw_score = max(min(float(raw_score), 95.0), 85.0)
                        suspicion_score = round(raw_score, 1)
                        new_acc = SuspiciousAccount(
                            account_id=account_id,
                            suspicion_score=suspicion_score,
                            detected_patterns=patterns,
                            ring_id=ring_key,
                            is_mule=raw_data.get('is_mule', False),
                            mule_role=raw_data.get('mule_role')
                        )
                        suspicious_accounts.append(new_acc)
                        acc_by_id[account_id] = new_acc
                        seen_account_ids.add(account_id)
                
                member_scores = []
                for acc_id in member_accounts:
                    acc_obj = acc_by_id.get(acc_id)
                    if acc_obj:
                        member_scores.append(float(acc_obj.suspicion_score))
                    else:
                        acc_data = pattern_data.get(acc_id, {})
                        raw_score = acc_data.get('suspicion_score', 0.0)
                        member_scores.append(min(max(float(raw_score), 0.0), 100.0))
                
                avg_score = sum(member_scores) / len(member_scores) if member_scores else 0.0
                cohesion_bonus = 0.0
                if len(member_accounts) >= 3 and self.graph_engine:
                    g = self.graph_engine.graph
                    ring_volume = 0.0
                    for i, aid in enumerate(member_accounts):
                        nxt = member_accounts[(i + 1) % len(member_accounts)]
                        if g.has_edge(aid, nxt):
                            ring_volume += g[aid][nxt].get('amount', 0.0)
                    if ring_volume > 10000:
                        cohesion_bonus = min(5.0, ring_volume / 50000)
                risk_score = round(min(95.0, avg_score + cohesion_bonus), 1)
                
                fraud_rings.append(
                    FraudRing(
                        ring_id=ring_key,
                        member_accounts=member_accounts,
                        pattern_type=cycle_info['pattern_type'],
                        risk_score=risk_score
                    )
                )
        
        # Task 8: Deterministic sort - DESC score, then account_id for ties
        suspicious_accounts.sort(key=lambda x: (-x.suspicion_score, x.account_id))
        
        # Step 3: Generate RIFT-compliant summary
        unique_accounts = len(set(df['source_account']).union(set(df['destination_account'])))
        
        summary = DetectionSummary(
            total_accounts_analyzed=unique_accounts,
            suspicious_accounts_flagged=len(suspicious_accounts),
            fraud_rings_detected=len(fraud_rings),
            processing_time_seconds=round(processing_time, 2)
        )
        
        # Step 4: Create final response
        response = AMLDetectionResponse(
            suspicious_accounts=suspicious_accounts,
            fraud_rings=fraud_rings,
            summary=summary
        )
        
        return response
    
    def get_performance_metrics(self) -> Dict:
        """
        Get pipeline performance metrics for optimization
        
        Returns:
            Performance metrics dictionary
        """
        metrics = {
            'graph_nodes': self.graph_engine.graph.number_of_nodes() if self.graph_engine else 0,
            'graph_edges': self.graph_engine.graph.number_of_edges() if self.graph_engine else 0,
            'pattern_detection_time': 0.0,
            'false_positive_reduction_time': 0.0,
            'total_processing_time': 0.0
        }
        
        return metrics
