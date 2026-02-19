"""
False Positive Control Service for RIFT 2026
Implements safeguards to avoid flagging legitimate business patterns
"""

import networkx as nx
import numpy as np
import hashlib
import pandas as pd
import logging
from typing import Dict, Set, List
from collections import defaultdict

logger = logging.getLogger(__name__)


class FalsePositiveController:
    """
    False Positive Control for AML Detection
    
    Implements safeguards to avoid flagging:
    - High-diversity merchant accounts
    - Payroll-like periodic accounts  
    - Legitimate business hubs with high degree but low velocity
    """
    
    def __init__(self, graph_engine):
        self.engine = graph_engine
        self.graph = graph_engine.graph
        self.transactions_df = graph_engine.transactions_df
        self._diversity_cache = None
        self._amount_cv_cache = None
        self._velocity_cache = None

        # Configuration - Task 5: Velocity-aware, degree-normalized
        self.config = {
            'merchant_diversity_threshold': 3.0,
            'merchant_in_out_ratio': 2.0,
            'merchant_min_degree': 20,
            'payroll_out_in_ratio': 2.0,
            'payroll_diversity_threshold': 2.0,
            'payroll_min_degree': 15,
            'business_hub_diversity_threshold': 4.0,
            'business_hub_min_degree': 30,
            'amount_consistency_threshold': 0.7,
            'velocity_threshold': 1000.0,
            'degree_normalization': True,  # Scale by graph size
            'min_velocity_for_suspicion': 500.0,  # Low velocity = less suspicious
        }
    
    def apply_false_positive_reduction(self, risk_scores: Dict[str, Dict]) -> Dict[str, Dict]:
        """
        Apply false positive reduction to risk scores
        
        Args:
            risk_scores: Raw risk scores from pattern detection
            
        Returns:
            Filtered risk scores with reduced false positives
        """
        logger.info("Applying false positive reduction...")
        # Precompute indicators for non-ring accounts only (batch for 10K+ perf)
        accounts_to_analyze = [a for a, d in risk_scores.items() if not d.get('ring_id')]
        if len(accounts_to_analyze) > 50:
            self._precompute_for_accounts(accounts_to_analyze)
        else:
            self._diversity_cache = self._amount_cv_cache = self._velocity_cache = None

        filtered_scores = {}
        fp_analysis = {}
        
        MIN_SUSPICION_THRESHOLD = 30.0
        STRONG_PATTERNS = {'cycle_length_3', 'cycle_length_4', 'cycle_length_5', 'pass_through', 'shell_chain', 'risk_propagation'}
        
        def _distinct_score(score: float, account_id: str) -> float:
            """Deterministic micro-adjustment so scores differ per account."""
            h = int(hashlib.md5(str(account_id).encode()).hexdigest()[:8], 16)
            perturb = (h % 19 - 9) / 100
            return round(min(max(score + perturb, 0.0), 100.0), 1)

        for account, score_data in risk_scores.items():
            original_score = score_data.get('suspicion_score', 0.0)
            patterns = set(score_data.get('detected_patterns', []))
            has_strong = bool(patterns & STRONG_PATTERNS) or any(p.startswith('cycle_length_') for p in patterns)
            
            if original_score < 1.0 and not patterns:
                continue
            
            if score_data.get('ring_id'):
                reduction_factor = 1.0
                fp_indicators = {}
            else:
                fp_indicators = self._analyze_false_positive_indicators(account)
                fp_analysis[account] = fp_indicators
                reduction_factor = self._calculate_reduction_factor(fp_indicators)
                reduction_factor = self._apply_overflagging_safeguard(reduction_factor, fp_indicators)
            
            adjusted_score = original_score * reduction_factor
            normalized_score = min(max(float(adjusted_score), 0.0), 100.0)
            suspicion_score = _distinct_score(normalized_score, account)
            
            if suspicion_score >= MIN_SUSPICION_THRESHOLD or has_strong or score_data.get('ring_id'):
                filtered_scores[account] = {
                    'suspicion_score': suspicion_score,
                    'detected_patterns': score_data.get('detected_patterns', []),
                    'ring_id': score_data.get('ring_id'),
                    'pattern_scores': score_data.get('pattern_scores', {}),
                    'is_mule': score_data.get('is_mule', False),
                    'mule_role': score_data.get('mule_role'),
                    'false_positive_indicators': fp_indicators,
                    'reduction_factor': round(reduction_factor, 3)
                }
        
        logger.info(f"False positive reduction: {len(risk_scores)} → {len(filtered_scores)} accounts")
        
        return filtered_scores
    
    def _precompute_for_accounts(self, accounts: List[str]):
        """Batch precompute diversity, amount CV, velocity for given accounts (10K+ optimization)"""
        self._diversity_cache = {}
        self._amount_cv_cache = {}
        self._velocity_cache = {}
        df = self.transactions_df
        for acc in accounts:
            if acc not in self.graph:
                continue
            senders = set(df.loc[df['destination_account'] == acc, 'source_account'].dropna())
            receivers = set(df.loc[df['source_account'] == acc, 'destination_account'].dropna())
            total = len(df[(df['source_account'] == acc) | (df['destination_account'] == acc)])
            self._diversity_cache[acc] = len(senders | receivers) / total if total > 0 else 0.0
            amounts = []
            for _, _, d in self.graph.out_edges(acc, data=True):
                a = d.get('amount', 0.0)
                if a > 0:
                    amounts.append(a)
            for _, _, d in self.graph.in_edges(acc, data=True):
                a = d.get('amount', 0.0)
                if a > 0:
                    amounts.append(a)
            if len(amounts) >= 3:
                mean_a, std_a = np.mean(amounts), np.std(amounts)
                self._amount_cv_cache[acc] = 1.0 / (1.0 + std_a / max(mean_a, 1e-9))
            else:
                self._amount_cv_cache[acc] = 0.0
            # Compute velocity from transactions_df (amount per hour)
            acc_txns = df[(df['source_account'] == acc) | (df['destination_account'] == acc)]
            if len(acc_txns) >= 2:
                time_span_hours = (acc_txns['timestamp'].max() - acc_txns['timestamp'].min()) / pd.Timedelta(hours=1)
                total_amt = acc_txns['amount'].sum()
                self._velocity_cache[acc] = total_amt / max(time_span_hours, 0.01) if time_span_hours > 0 else total_amt
            else:
                self._velocity_cache[acc] = acc_txns['amount'].sum() if len(acc_txns) > 0 else 0.0

    def _precompute_caches(self):
        """Called when caches not precomputed - ensures we compute on demand"""
        if self._diversity_cache is not None:
            return
        self._diversity_cache = {}
        self._amount_cv_cache = {}
        self._velocity_cache = {}

    def _analyze_false_positive_indicators(self, account: str) -> Dict:
        """
        Analyze account for false positive indicators
        
        Returns:
            Dictionary with various false positive indicators
        """
        indicators = {
            'is_merchant': False,
            'is_payroll': False,
            'is_business_hub': False,
            'amount_consistency': 0.0,
            'avg_velocity': 0.0,
            'diversity_index': 0.0,
            'in_out_ratio': 0.0,
            'total_degree': 0,
            'unique_counterparties': 0
        }
        
        in_degree = self.graph.in_degree(account)
        out_degree = self.graph.out_degree(account)
        total_degree = in_degree + out_degree
        indicators['total_degree'] = total_degree
        indicators['in_out_ratio'] = in_degree / max(out_degree, 1)

        self._precompute_caches()
        if self._diversity_cache is not None and account in self._diversity_cache:
            indicators['diversity_index'] = self._diversity_cache[account]
            indicators['amount_consistency'] = self._amount_cv_cache.get(account, 0.0)
            indicators['avg_velocity'] = self._velocity_cache.get(account, 0.0)
        else:
            indicators['diversity_index'] = self._calculate_diversity_index(account)
            indicators['amount_consistency'] = self._calculate_amount_consistency(account)
            indicators['avg_velocity'] = self._calculate_average_velocity(account)
        df = self.transactions_df
        senders = set(df.loc[df['destination_account'] == account, 'source_account'].dropna())
        receivers = set(df.loc[df['source_account'] == account, 'destination_account'].dropna())
        indicators['unique_counterparties'] = len(senders | receivers)
        
        div = indicators['diversity_index']
        amt_cons = indicators['amount_consistency']
        avg_vel = indicators['avg_velocity']
        indicators['is_merchant'] = (
            div >= self.config['merchant_diversity_threshold'] and
            total_degree >= self.config['merchant_min_degree'] and
            in_degree >= out_degree * self.config['merchant_in_out_ratio']
        )
        indicators['is_payroll'] = (
            total_degree >= self.config['payroll_min_degree'] and
            out_degree >= in_degree * self.config['payroll_out_in_ratio'] and
            div >= self.config['payroll_diversity_threshold'] and
            amt_cons >= self.config['amount_consistency_threshold']
        )
        indicators['is_business_hub'] = (
            total_degree >= self.config['business_hub_min_degree'] and
            div >= self.config['business_hub_diversity_threshold'] and
            avg_vel <= self.config['velocity_threshold']
        )
        
        return indicators
    
    def _calculate_reduction_factor(self, indicators: Dict) -> float:
        """
        Task 5: Velocity-aware, degree-normalized reduction
        """
        reduction_factor = 1.0
        
        if indicators['is_merchant']:
            reduction_factor *= 0.2
        elif indicators['is_payroll']:
            reduction_factor *= 0.3
        elif indicators['is_business_hub']:
            reduction_factor *= 0.4
        
        if indicators['amount_consistency'] > 0.8:
            reduction_factor *= 0.7
        
        # Velocity-aware: low velocity = less suspicious (legitimate patterns)
        if indicators['avg_velocity'] < self.config['min_velocity_for_suspicion']:
            reduction_factor *= 0.8
        
        # Degree normalization: high-degree accounts in large graphs may be hubs
        if self.config.get('degree_normalization') and indicators.get('total_degree', 0) > 0:
            n = self.graph.number_of_nodes()
            if n > 100:
                degree_ratio = indicators['total_degree'] / n
                if degree_ratio > 0.05:  # Top 5% by degree
                    reduction_factor *= 0.9
        
        return reduction_factor
    
    def _apply_overflagging_safeguard(self, reduction_factor: float, indicators: Dict) -> float:
        """Reduce 20–40% for high diversity (>10 unique), low velocity, consistent intervals."""
        r = reduction_factor
        if indicators.get('unique_counterparties', 0) > 10:
            r *= 0.75
        if indicators.get('avg_velocity', 0) < self.config.get('min_velocity_for_suspicion', 500):
            r *= 0.8
        if indicators.get('amount_consistency', 0) > 0.8:
            r *= 0.8
        return r
    
    def _calculate_diversity_index(self, account: str) -> float:
        """
        Task 5: Transaction diversity index from transactions_df
        Higher diversity = more unique counterparties = likely merchant/payroll
        Uses actual transaction count for accuracy
        """
        if self.transactions_df is None or account not in self.graph:
            return 0.0
        
        df = self.transactions_df
        senders = set(df.loc[df['destination_account'] == account, 'source_account'].dropna())
        receivers = set(df.loc[df['source_account'] == account, 'destination_account'].dropna())
        unique_counterparties = len(senders | receivers)
        total_txns = len(df[(df['source_account'] == account) | (df['destination_account'] == account)])
        
        if total_txns == 0:
            return 0.0
        return unique_counterparties / total_txns
    
    def _calculate_amount_consistency(self, account: str) -> float:
        """
        Calculate transaction amount consistency using coefficient of variation
        Higher consistency = lower CV = more likely legitimate
        
        Returns:
            Consistency score (0.0 to 1.0)
        """
        # Get all transaction amounts for this account
        amounts = []
        
        # Outgoing amounts
        for _, _, edge_data in self.graph.out_edges(account, data=True):
            amt = edge_data.get('amount', 0.0)
            if amt > 0:
                amounts.append(amt)

        # Incoming amounts
        for _, _, edge_data in self.graph.in_edges(account, data=True):
            amt = edge_data.get('amount', 0.0)
            if amt > 0:
                amounts.append(amt)
        
        if len(amounts) < 3:
            return 0.0
        
        # Calculate coefficient of variation
        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts)
        
        if mean_amount == 0:
            return 0.0
        
        cv = std_amount / mean_amount
        
        # Convert to consistency score (inverse of CV)
        consistency = 1.0 / (1.0 + cv)
        
        return consistency
    
    def _calculate_average_velocity(self, account: str) -> float:
        """
        Calculate average transaction velocity (amount per hour)
        
        Returns:
            Average velocity
        """
        df = self.transactions_df
        acc_txns = df[(df['source_account'] == account) | (df['destination_account'] == account)]
        if len(acc_txns) >= 2:
            time_span_hours = (acc_txns['timestamp'].max() - acc_txns['timestamp'].min()) / pd.Timedelta(hours=1)
            total_amt = acc_txns['amount'].sum()
            return total_amt / max(time_span_hours, 0.01) if time_span_hours > 0 else total_amt
        return acc_txns['amount'].sum() if len(acc_txns) > 0 else 0.0
    
    def get_false_positive_report(self) -> Dict:
        """
        Generate false positive analysis report
        
        Returns:
            Summary of false positive analysis
        """
        # Analyze all accounts in the graph
        all_accounts = list(self.graph.nodes())
        
        merchant_count = 0
        payroll_count = 0
        business_hub_count = 0
        
        for account in all_accounts:
            indicators = self._analyze_false_positive_indicators(account)
            
            if indicators['is_merchant']:
                merchant_count += 1
            elif indicators['is_payroll']:
                payroll_count += 1
            elif indicators['is_business_hub']:
                business_hub_count += 1
        
        return {
            'total_accounts_analyzed': len(all_accounts),
            'potential_merchants': merchant_count,
            'potential_payroll': payroll_count,
            'potential_business_hubs': business_hub_count,
            'total_false_positive_candidates': merchant_count + payroll_count + business_hub_count,
            'false_positive_rate': (merchant_count + payroll_count + business_hub_count) / len(all_accounts) * 100
        }
