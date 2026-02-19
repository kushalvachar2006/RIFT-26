"""
Risk Scoring and Propagation Service
Computes final risk scores and propagates suspicion through network
"""

import networkx as nx
import numpy as np
from typing import Dict, List, Set
from collections import defaultdict


class RiskScoringEngine:
    """
    Risk scoring and propagation using:
    - Multi-factor weighted scoring
    - Personalized PageRank for risk propagation
    - False positive reduction
    """
    
    def __init__(self, graph_engine, pattern_detector):
        self.engine = graph_engine
        self.graph = graph_engine.graph
        self.detector = pattern_detector
        
        # Weight configuration (must sum to 100)
        self.weights = {
            'cycle_participation': 0.25,
            'velocity_risk': 0.20,
            'fan_patterns': 0.20,
            'pass_through': 0.20,
            'risk_propagation': 0.15
        }
    
    def compute_risk_scores(self, pattern_data: Dict) -> Dict[str, Dict]:
        """
        Compute comprehensive risk scores for all accounts
        
        Args:
            pattern_data: Pattern detection results
            
        Returns:
            Dictionary mapping account_id to risk metrics
        """
        risk_scores = {}
        
        # Step 1: Compute base scores from patterns
        base_scores = self._compute_base_scores(pattern_data)
        
        # Step 2: Apply false positive reduction
        filtered_scores = self._reduce_false_positives(base_scores)
        
        # Step 3: Risk propagation via PageRank
        propagated_scores = self._propagate_risk(filtered_scores)
        
        # Step 4: Combine and normalize
        for account in self.graph.nodes():
            base_score = filtered_scores.get(account, 0.0)
            prop_score = propagated_scores.get(account, 0.0)
            
            # Weighted combination
            final_score = (
                (1 - self.weights['risk_propagation']) * base_score +
                self.weights['risk_propagation'] * prop_score * 100
            )
            
            # Normalize to 0-100
            final_score = min(max(final_score, 0.0), 100.0)
            
            if final_score > 10.0 or account in pattern_data:  # Only include suspicious accounts
                risk_scores[account] = {
                    'suspicion_score': round(final_score, 2),
                    'base_score': round(base_score, 2),
                    'propagation_score': round(prop_score, 2),
                    'patterns': pattern_data.get(account, {}).get('patterns', []),
                    'pattern_details': pattern_data.get(account, {})
                }
        
        return risk_scores
    
    def _compute_base_scores(self, pattern_data: Dict) -> Dict[str, float]:
        """
        Compute base risk scores from detected patterns
        
        Args:
            pattern_data: Pattern detection results
            
        Returns:
            Dictionary of base risk scores (0-100)
        """
        base_scores = {}
        
        for account, data in pattern_data.items():
            score = 0.0
            
            # Cycle participation (25%)
            if data.get('cycle_rings'):
                cycle_score = len(data['cycle_rings']) * 10  # 10 points per ring
                cycle_score = min(cycle_score, 25)  # Cap at 25
                score += cycle_score
            
            # Velocity risk (20%)
            velocity_score = data.get('velocity_score', 0.0) * 20
            score += velocity_score
            
            # Fan patterns (20%)
            fan_in = data.get('fan_in_score', 0.0) * 10
            fan_out = data.get('fan_out_score', 0.0) * 10
            score += fan_in + fan_out
            
            # Pass-through (20%)
            pt_score = data.get('pass_through_score', 0.0) * 20
            score += pt_score
            
            base_scores[account] = min(score, 100.0)
        
        return base_scores
    
    def _reduce_false_positives(self, base_scores: Dict[str, float]) -> Dict[str, float]:
        """
        Reduce false positives by filtering legitimate business patterns
        
        Args:
            base_scores: Base risk scores
            
        Returns:
            Filtered risk scores
        """
        filtered_scores = {}
        
        for account, score in base_scores.items():
            node_data = self.graph.nodes[account]
            
            # Compute legitimacy indicators
            diversity_index = node_data.get('diversity_index', 0.0)
            total_degree = node_data.get('total_degree', 0)
            in_count = node_data.get('in_txn_count', 0)
            out_count = node_data.get('out_txn_count', 0)
            
            # Merchant detection: high in-degree, high diversity
            is_merchant = (
                diversity_index > 3.0 and
                total_degree > 20 and
                in_count > out_count * 2  # Mostly receiving
            )
            
            # Payroll detection: periodic patterns, high out-degree
            is_payroll = (
                total_degree > 15 and
                out_count > in_count * 2 and  # Mostly sending
                diversity_index > 2.0
            )
            
            # Business hub detection: high degree, moderate velocity
            is_business_hub = (
                total_degree > 30 and
                diversity_index > 4.0
            )
            
            # Apply reduction factors
            reduction_factor = 1.0
            
            if is_merchant:
                reduction_factor *= 0.3  # 70% reduction
            elif is_payroll:
                reduction_factor *= 0.4  # 60% reduction
            elif is_business_hub:
                reduction_factor *= 0.5  # 50% reduction
            
            # Additional: amount consistency check
            amount_consistency = self._compute_amount_consistency(account)
            if amount_consistency > 0.7:  # High consistency = likely legitimate
                reduction_factor *= 0.8
            
            adjusted_score = score * reduction_factor
            
            # Only keep if still significant
            if adjusted_score > 5.0:
                filtered_scores[account] = adjusted_score
        
        return filtered_scores
    
    def _compute_amount_consistency(self, account: str) -> float:
        """
        Compute transaction amount consistency
        High consistency = likely legitimate (payroll, subscriptions)
        
        Args:
            account: Account ID
            
        Returns:
            Consistency score (0-1)
        """
        out_edges = list(self.graph.out_edges(account, data=True))
        
        if len(out_edges) < 3:
            return 0.0
        
        amounts = [data['avg_amount'] for _, _, data in out_edges]
        
        # Compute coefficient of variation
        mean_amount = np.mean(amounts)
        std_amount = np.std(amounts)
        
        if mean_amount == 0:
            return 0.0
        
        cv = std_amount / mean_amount
        
        # Invert: low CV = high consistency
        consistency = 1.0 / (1.0 + cv)
        
        return consistency
    
    def _propagate_risk(
        self, 
        seed_scores: Dict[str, float],
        alpha: float = 0.85,
        max_iter: int = 100
    ) -> Dict[str, float]:
        """
        Propagate risk through network using Personalized PageRank
        
        Args:
            seed_scores: Initial risk scores (seed set)
            alpha: Damping factor (0.85 = standard PageRank)
            max_iter: Maximum iterations
            
        Returns:
            Propagated risk scores (0-1)
        """
        if not seed_scores:
            return {}
        
        # Normalize seed scores to create personalization vector
        total_seed = sum(seed_scores.values())
        if total_seed == 0:
            return {}
        
        personalization = {
            account: score / total_seed
            for account, score in seed_scores.items()
        }
        
        try:
            # Run Personalized PageRank
            pagerank_scores = nx.pagerank(
                self.graph,
                alpha=alpha,
                personalization=personalization,
                max_iter=max_iter,
                tol=1e-6
            )
            
            # Apply hop-based decay
            decayed_scores = self._apply_hop_decay(seed_scores, pagerank_scores)
            
            return decayed_scores
        
        except:
            # Fallback if PageRank fails
            return {account: score / 100.0 for account, score in seed_scores.items()}
    
    def _apply_hop_decay(
        self,
        seed_scores: Dict[str, float],
        pagerank_scores: Dict[str, float],
        decay_rate: float = 0.5
    ) -> Dict[str, float]:
        """
        Apply hop-based decay to propagated scores
        
        Args:
            seed_scores: Original seed scores
            pagerank_scores: PageRank scores
            decay_rate: Decay per hop (0.5 = 50% decay)
            
        Returns:
            Decayed propagation scores
        """
        decayed = {}
        
        # Compute shortest path distances from seed nodes
        seed_nodes = set(seed_scores.keys())
        
        for account in self.graph.nodes():
            if account in seed_nodes:
                # Seed nodes keep full propagation score
                decayed[account] = pagerank_scores.get(account, 0.0)
            else:
                # Find minimum distance to any seed node
                min_distance = float('inf')
                
                for seed in seed_nodes:
                    try:
                        # Use undirected for proximity
                        distance = nx.shortest_path_length(
                            self.graph.to_undirected(),
                            source=seed,
                            target=account
                        )
                        min_distance = min(min_distance, distance)
                    except nx.NetworkXNoPath:
                        continue
                
                if min_distance != float('inf'):
                    # Apply exponential decay
                    decay = decay_rate ** min_distance
                    decayed[account] = pagerank_scores.get(account, 0.0) * decay
                else:
                    decayed[account] = 0.0
        
        return decayed
    
    def get_high_risk_accounts(
        self,
        risk_scores: Dict[str, Dict],
        threshold: float = 60.0
    ) -> List[str]:
        """
        Get list of high-risk accounts
        
        Args:
            risk_scores: Risk score dictionary
            threshold: Risk threshold (default 60)
            
        Returns:
            List of high-risk account IDs
        """
        high_risk = [
            account
            for account, data in risk_scores.items()
            if data['suspicion_score'] >= threshold
        ]
        
        return sorted(high_risk, key=lambda x: risk_scores[x]['suspicion_score'], reverse=True)
