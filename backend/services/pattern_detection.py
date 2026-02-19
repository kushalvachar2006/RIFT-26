"""
Pattern Detection Service
Implements cycle, fan-in/out, velocity, and pass-through detection
"""

import networkx as nx
import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Set, Tuple
from collections import defaultdict
from datetime import timedelta

logger = logging.getLogger(__name__)


class PatternDetector:
    """
    Detects suspicious patterns in transaction networks:
    - Cycle detection (fraud rings)
    - Fan-in/Fan-out (smurfing, layering)
    - High velocity chains
    - Pass-through accounts (shell accounts)
    """
    
    def __init__(self, graph_engine):
        self.engine = graph_engine
        self.graph = graph_engine.graph
        self.detected_patterns = defaultdict(list)
        
    def detect_all_patterns(self) -> Dict[str, Dict]:
        """
        Run all pattern detection algorithms
        
        Returns:
            Dictionary of detected patterns by account
        """
        # Reset patterns
        self.detected_patterns = defaultdict(list)
        
        # Run detection algorithms
        cycles = self.detect_cycles()
        fan_patterns = self.detect_fan_patterns()
        velocity_risks = self.detect_velocity_risks()
        pass_through = self.detect_pass_through_accounts()
        
        # Aggregate patterns by account
        account_patterns = defaultdict(lambda: {
            'patterns': [],
            'cycle_rings': [],
            'fan_in_score': 0.0,
            'fan_out_score': 0.0,
            'velocity_score': 0.0,
            'pass_through_score': 0.0
        })
        
        # Add cycle patterns
        for cycle_info in cycles:
            for account in cycle_info['accounts']:
                account_patterns[account]['patterns'].append(
                    f"cycle_length_{cycle_info['length']}"
                )
                account_patterns[account]['cycle_rings'].append(cycle_info['ring_id'])
        
        # Add fan patterns
        for account, metrics in fan_patterns.items():
            if metrics['fan_in_detected']:
                account_patterns[account]['patterns'].append('fan_in')
                account_patterns[account]['fan_in_score'] = metrics['fan_in_score']
            if metrics['fan_out_detected']:
                account_patterns[account]['patterns'].append('fan_out')
                account_patterns[account]['fan_out_score'] = metrics['fan_out_score']
        
        # Add velocity risks
        for account, score in velocity_risks.items():
            if score > 0.5:
                account_patterns[account]['patterns'].append('high_velocity')
                account_patterns[account]['velocity_score'] = score
        
        # Add pass-through
        for account, score in pass_through.items():
            if score > 0.6:
                account_patterns[account]['patterns'].append('pass_through')
                account_patterns[account]['pass_through_score'] = score
        
        return dict(account_patterns)
    
    def detect_cycles(self, min_length: int = 3, max_length: int = 5) -> List[Dict]:
        """
        Detect cycles (fraud rings) using NetworkX simple cycles
        
        Args:
            min_length: Minimum cycle length
            max_length: Maximum cycle length
            
        Returns:
            List of detected fraud rings
        """
        fraud_rings = []
        detected_cycles = set()
        
        try:
            logger.info(f"Starting cycle detection on graph with {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
            
            # Performance optimization: limit cycle search for large graphs
            if self.graph.number_of_nodes() > 1000:
                # Use degree-based sampling for large graphs
                high_degree_nodes = [
                    n for n in self.graph.nodes() 
                    if self.graph.degree(n) >= 2
                ][:200]  # Limit to top 200 high-degree nodes
                
                # Create subgraph for efficiency
                subgraph = self.graph.subgraph(high_degree_nodes)
                all_cycles = list(nx.simple_cycles(subgraph))
                logger.info(f"Using subgraph optimization: {len(high_degree_nodes)} nodes, {len(all_cycles)} cycles")
            else:
                # Use full graph for smaller datasets
                all_cycles = list(nx.simple_cycles(self.graph))
                logger.info(f"Using full graph: {len(all_cycles)} cycles")
            
            # Filter by length and remove duplicates
            unique_cycles = []
            for cycle in all_cycles:
                if min_length <= len(cycle) <= max_length:
                    # Normalize cycle representation
                    normalized = tuple(sorted(cycle))
                    if normalized not in detected_cycles:
                        detected_cycles.add(normalized)
                        unique_cycles.append(cycle)
            
            logger.info(f"Found {len(unique_cycles)} unique cycles after filtering")
            
            # Validate cycles temporally and compute risk
            ring_id = 1
            for cycle in unique_cycles:
                if self._validate_cycle_temporally(cycle):
                    total_volume = self._compute_cycle_volume(cycle)
                    
                    fraud_rings.append({
                        'ring_id': f"RING_{ring_id:03d}",
                        'accounts': cycle,
                        'length': len(cycle),
                        'total_volume': total_volume,
                        'risk_level': self._assess_cycle_risk(cycle, total_volume),
                        'pattern_type': 'Cycle Pattern',
                        'transaction_count': self._count_cycle_transactions(cycle)
                    })
                    ring_id += 1
        
        except Exception as e:
            logger.error(f"Cycle detection error: {e}")
            import traceback
            traceback.print_exc()
        
        return fraud_rings
    
    def _find_cycles_from_node(
        self, 
        start_node: str, 
        max_length: int = 5
    ) -> List[List[str]]:
        """
        Find cycles starting from a specific node using DFS
        
        Args:
            start_node: Starting node
            max_length: Maximum cycle length
            
        Returns:
            List of cycles (each cycle is a list of nodes)
        """
        cycles = []
        max_cycles_per_node = 10  # Limit cycles per node for performance
        
        def dfs(node, path, visited):
            if len(cycles) >= max_cycles_per_node:
                return
            
            if len(path) > max_length:
                return
            
            if node == start_node and len(path) >= 3:
                cycles.append(path[:])
                return
            
            if node in visited and node != start_node:
                return
            
            # Check successors
            for neighbor in self.graph.successors(node):
                if neighbor == start_node and len(path) >= 2:
                    # Found cycle back to start
                    cycles.append(path + [neighbor])
                elif neighbor not in visited:
                    visited.add(neighbor)
                    dfs(neighbor, path + [neighbor], visited)
                    visited.remove(neighbor)  # Backtrack
        
        # Start DFS
        dfs(start_node, [start_node], set([start_node]))
        
        return cycles
    
    def _validate_cycle_temporally(self, cycle: List[str]) -> bool:
        """
        Validate that cycle could occur in temporal order
        
        Args:
            cycle: List of accounts in cycle
            
        Returns:
            True if cycle is temporally valid
        """
        # Check if all edges in cycle exist
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            
            if not self.graph.has_edge(src, dst):
                return False
        
        # Additional temporal validation could be added here
        # For now, just check edge existence
        return True
    
    def _compute_cycle_volume(self, cycle: List[str]) -> float:
        """Compute total transaction volume in cycle"""
        total = 0.0
        
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            
            if self.graph.has_edge(src, dst):
                edge_data = self.graph[src][dst]
                total += edge_data.get('total_amount', 0.0)
        
        return total
    
    def _count_cycle_transactions(self, cycle: List[str]) -> int:
        """Count total transactions in a cycle"""
        total_txns = 0
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            if self.graph.has_edge(src, dst):
                edge_data = self.graph[src][dst]
                total_txns += edge_data.get('txn_count', 0)
        return total_txns
    
    def _assess_cycle_risk(self, cycle: List[str], total_volume: float) -> str:
        """
        Assess risk level of detected cycle
        
        Args:
            cycle: List of accounts
            total_volume: Total transaction volume
            
        Returns:
            Risk level: LOW, MEDIUM, HIGH, CRITICAL
        """
        # Factors: cycle length, volume, velocity
        cycle_len = len(cycle)
        
        # Compute average velocity in cycle
        total_velocity = 0.0
        edge_count = 0
        
        for i in range(len(cycle)):
            src = cycle[i]
            dst = cycle[(i + 1) % len(cycle)]
            
            if self.graph.has_edge(src, dst):
                edge_data = self.graph[src][dst]
                total_velocity += edge_data.get('rolling_velocity', 0.0)
                edge_count += 1
        
        avg_velocity = total_velocity / max(edge_count, 1)
        
        # Risk scoring
        risk_score = 0
        
        if cycle_len == 3:
            risk_score += 3  # Tight cycles are higher risk
        elif cycle_len == 4:
            risk_score += 2
        else:
            risk_score += 1
        
        if total_volume > 100000:
            risk_score += 3
        elif total_volume > 50000:
            risk_score += 2
        elif total_volume > 10000:
            risk_score += 1
        
        if avg_velocity > 10000:  # High velocity
            risk_score += 2
        
        # Map to risk level
        if risk_score >= 7:
            return "CRITICAL"
        elif risk_score >= 5:
            return "HIGH"
        elif risk_score >= 3:
            return "MEDIUM"
        else:
            return "LOW"
    
    def detect_fan_patterns(self, window_hours: int = 72) -> Dict[str, Dict]:
        """
        Detect fan-in and fan-out patterns (smurfing, layering)
        
        Args:
            window_hours: Time window for burst detection
            
        Returns:
            Dictionary of accounts with fan pattern metrics
        """
        fan_patterns = {}
        
        for account in self.graph.nodes():
            in_edges = list(self.graph.in_edges(account, data=True))
            out_edges = list(self.graph.out_edges(account, data=True))
            
            # Fan-in detection (many sources → one account)
            fan_in_score = self._compute_fan_score(
                in_edges, 
                direction='in',
                window_hours=window_hours
            )
            
            # Fan-out detection (one account → many destinations)
            fan_out_score = self._compute_fan_score(
                out_edges,
                direction='out',
                window_hours=window_hours
            )
            
            # Thresholds
            fan_in_threshold = 0.6
            fan_out_threshold = 0.6
            
            if fan_in_score > fan_in_threshold or fan_out_score > fan_out_threshold:
                fan_patterns[account] = {
                    'fan_in_score': fan_in_score,
                    'fan_out_score': fan_out_score,
                    'fan_in_detected': fan_in_score > fan_in_threshold,
                    'fan_out_detected': fan_out_score > fan_out_threshold,
                    'in_degree': len(in_edges),
                    'out_degree': len(out_edges)
                }
        
        return fan_patterns
    
    def _compute_fan_score(
        self, 
        edges: List[Tuple], 
        direction: str,
        window_hours: int = 72
    ) -> float:
        """
        Compute fan-in or fan-out score
        
        Args:
            edges: List of edges
            direction: 'in' or 'out'
            window_hours: Time window
            
        Returns:
            Fan score (0-1)
        """
        if len(edges) < 3:  # Need at least 3 connections to be suspicious
            return 0.0
        
        # Extract edge attributes
        total_amount = sum(data['total_amount'] for _, _, data in edges)
        total_txns = sum(data['txn_count'] for _, _, data in edges)
        avg_frequency = np.mean([data['txn_frequency'] for _, _, data in edges])
        
        # Scoring factors
        degree_score = min(len(edges) / 20.0, 1.0)  # Normalize by 20 connections
        volume_score = min(total_amount / 100000.0, 1.0)  # Normalize by $100k
        frequency_score = min(avg_frequency / 10.0, 1.0)  # Normalize by 10 txns/day
        
        # Burst detection: check if transactions clustered in time
        burst_score = self._detect_burst(edges, window_hours)
        
        # Weighted combination
        fan_score = (
            0.3 * degree_score +
            0.3 * volume_score +
            0.2 * frequency_score +
            0.2 * burst_score
        )
        
        return min(fan_score, 1.0)
    
    def _detect_burst(self, edges: List[Tuple], window_hours: int) -> float:
        """
        Detect if transactions occur in bursts
        
        Args:
            edges: List of edges
            window_hours: Time window
            
        Returns:
            Burst score (0-1)
        """
        if len(edges) < 2:
            return 0.0
        
        # Collect all timestamps from edges
        all_timestamps = []
        for _, _, data in edges:
            if 'first_txn' in data:
                all_timestamps.append(data['first_txn'])
            if 'last_txn' in data:
                all_timestamps.append(data['last_txn'])
        
        if len(all_timestamps) < 2:
            return 0.0
        
        all_timestamps.sort()
        
        # Check for clustering within window
        window_delta = pd.Timedelta(hours=window_hours)
        max_cluster_size = 0
        
        for i, ts in enumerate(all_timestamps):
            window_end = ts + window_delta
            cluster_size = sum(
                1 for other_ts in all_timestamps[i:]
                if other_ts <= window_end
            )
            max_cluster_size = max(max_cluster_size, cluster_size)
        
        # Normalize
        burst_score = max_cluster_size / len(all_timestamps)
        
        return min(burst_score, 1.0)
    
    def detect_velocity_risks(self) -> Dict[str, float]:
        """
        Detect high-velocity transaction chains
        
        Returns:
            Dictionary of accounts with velocity risk scores
        """
        velocity_risks = {}
        
        for account in self.graph.nodes():
            latencies = self.engine.get_transaction_latency(account)
            
            if not latencies:
                continue
            
            # Compute velocity metrics
            avg_latency = np.mean(latencies)
            min_latency = np.min(latencies)
            
            # Flag rapid chains (< 30 min = 1800 seconds)
            rapid_count = sum(1 for lat in latencies if lat < 1800)
            rapid_ratio = rapid_count / len(latencies)
            
            # Compute burstiness (variance in latency)
            if len(latencies) > 1:
                latency_std = np.std(latencies)
                burstiness = latency_std / (avg_latency + 1)
            else:
                burstiness = 0.0
            
            # Risk score
            velocity_score = 0.0
            
            if min_latency < 300:  # < 5 minutes
                velocity_score += 0.4
            elif min_latency < 1800:  # < 30 minutes
                velocity_score += 0.2
            
            velocity_score += min(rapid_ratio, 0.4)
            velocity_score += min(burstiness / 10, 0.2)
            
            if velocity_score > 0.3:
                velocity_risks[account] = min(velocity_score, 1.0)
        
        return velocity_risks
    
    def detect_pass_through_accounts(self) -> Dict[str, float]:
        """
        Detect pass-through/shell accounts
        
        Returns:
            Dictionary of accounts with pass-through scores
        """
        pass_through_scores = {}
        
        for account in self.graph.nodes():
            node_data = self.graph.nodes[account]
            
            pass_through_ratio = node_data.get('pass_through_ratio', 0.0)
            in_count = node_data.get('in_txn_count', 0)
            out_count = node_data.get('out_txn_count', 0)
            
            # Check if ratio ≈ 1 (outgoing ≈ incoming)
            ratio_closeness = 1.0 - abs(pass_through_ratio - 1.0)
            
            if ratio_closeness < 0.5 or in_count < 2:
                continue
            
            # High transaction frequency
            frequency_score = min((in_count + out_count) / 50.0, 1.0)
            
            # Low retention (check latency)
            latencies = self.engine.get_transaction_latency(account)
            if latencies:
                avg_latency = np.mean(latencies)
                retention_score = 1.0 - min(avg_latency / 86400.0, 1.0)  # Low retention = high score
            else:
                retention_score = 0.0
            
            # Pass-through score
            pt_score = (
                0.5 * ratio_closeness +
                0.3 * frequency_score +
                0.2 * retention_score
            )
            
            if pt_score > 0.5:
                pass_through_scores[account] = min(pt_score, 1.0)
        
        return pass_through_scores
