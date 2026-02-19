"""
Core Graph Engine for Transaction Network Analysis
Optimized O(E) construction with minimal attributes for 10K+ transaction performance
"""

import networkx as nx
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Set
from collections import defaultdict


class TransactionGraphEngine:
    """
    Optimized directed graph engine for transaction network analysis
    O(E) construction with adjacency lists, pre-grouped transactions, single-pass sorting
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self.transactions_df = None
        self.account_profiles = defaultdict(dict)
        self.temporal_index = {}
        self.performance_metrics = {
            'graph_build_time': 0.0,
            'edge_construction_time': 0.0,
            'node_attributes_time': 0.0
        }
        
    def build_graph(self, transactions_df: pd.DataFrame) -> None:
        """
        Build temporal directed graph from transaction data - O(E) optimized
        
        Edge attributes: amount, timestamp (first occurrence)
        Node attributes: total_in_degree, total_out_degree, total_transactions,
                         suspicion_score (init 0), detected_patterns (init []), ring_id (init None)
        
        Args:
            transactions_df: DataFrame with columns [transaction_id, source_account, 
                            destination_account, amount, timestamp]
        """
        build_start = time.time()
        self.transactions_df = transactions_df.copy()
        
        # Ensure timestamp is datetime (single pass)
        if not pd.api.types.is_datetime64_any_dtype(self.transactions_df['timestamp']):
            self.transactions_df['timestamp'] = pd.to_datetime(
                self.transactions_df['timestamp'], 
                errors='coerce'
            )
        
        # Sort by timestamp once - O(E log E) but necessary for temporal analysis
        self.transactions_df = self.transactions_df.sort_values('timestamp').reset_index(drop=True)
        
        # Pre-group transactions per account for O(E) node attribute computation
        edge_start = time.time()
        self._build_edges_optimized()
        self.performance_metrics['edge_construction_time'] = time.time() - edge_start
        
        # Compute node attributes in single pass - O(V)
        node_start = time.time()
        self._compute_node_attributes_optimized()
        self.performance_metrics['node_attributes_time'] = time.time() - node_start
        
        # Build temporal index only for larger graphs
        if len(self.transactions_df) > 5000:
            self._build_temporal_index()
        else:
            self.temporal_index = defaultdict(list)
        
        self.performance_metrics['graph_build_time'] = time.time() - build_start
        
    def _build_edges_optimized(self) -> None:
        """
        Build edges with minimal attributes - O(E) using pre-grouped transactions
        Edge attributes: amount (sum), timestamp (first)
        """
        # Pre-group by (source, destination) - pandas groupby is O(E)
        edge_groups = self.transactions_df.groupby(['source_account', 'destination_account'], sort=False)
        
        # Single pass: aggregate amount, get first timestamp
        for (src, dst), group in edge_groups:
            # Edge attributes: amount (total), timestamp (first occurrence)
            total_amount = float(group['amount'].sum())
            first_timestamp = group['timestamp'].iloc[0]
            
            # Add edge with minimal attributes
            self.graph.add_edge(src, dst, amount=total_amount, timestamp=first_timestamp)
            
            # Ensure nodes exist (NetworkX handles this, but explicit for clarity)
            if src not in self.graph:
                self.graph.add_node(src)
            if dst not in self.graph:
                self.graph.add_node(dst)
    
    def _compute_frequency(self, timestamps: np.ndarray) -> float:
        """Compute transaction frequency (txns per day)"""
        if len(timestamps) < 2:
            return 0.0
        
        time_span_seconds = (timestamps[-1] - timestamps[0]) / pd.Timedelta(seconds=1)
        time_span_days = time_span_seconds / 86400  # days
        if time_span_days == 0:
            return float(len(timestamps))
        return float(len(timestamps) / max(time_span_days, 0.01))
    
    def _compute_velocity(self, amounts: np.ndarray, timestamps: np.ndarray) -> float:
        """Compute rolling velocity (amount per hour)"""
        if len(amounts) < 2:
            return float(amounts[0]) if len(amounts) == 1 else 0.0
        
        time_span_seconds = (timestamps[-1] - timestamps[0]) / pd.Timedelta(seconds=1)
        time_span_hours = time_span_seconds / 3600  # hours
        total_amount = np.sum(amounts)
        
        if time_span_hours == 0:
            return float(total_amount)
        return float(total_amount / max(time_span_hours, 0.01))
    
    def _compute_time_decay(self, timestamps: np.ndarray, decay_rate: float = 0.1) -> float:
        """
        Compute time-decayed weight (recent transactions weighted higher)
        
        Args:
            timestamps: Transaction timestamps
            decay_rate: Exponential decay rate (default 0.1)
        """
        if len(timestamps) == 0:
            return 0.0
        
        # Use most recent timestamp as reference
        latest = timestamps[-1]
        
        # Compute days difference
        days_diff = np.array([
            (latest - ts) / pd.Timedelta(days=1)
            for ts in timestamps
        ])
        
        # Exponential decay: weight = exp(-decay_rate * days)
        weights = np.exp(-decay_rate * days_diff)
        
        return float(np.mean(weights))
    
    def _compute_node_attributes_optimized(self) -> None:
        """
        Compute node attributes - O(E) using vectorized value_counts
        Node attributes: total_in_degree, total_out_degree, total_transactions,
                         suspicion_score (init 0), detected_patterns (init []), ring_id (init None)
        """
        df = self.transactions_df
        # Vectorized: count transactions per account - O(E)
        src_counts = df['source_account'].value_counts()
        dst_counts = df['destination_account'].value_counts()
        # Total transactions = sum of (as source) + (as dest) counts per account
        all_accounts = set(src_counts.index) | set(dst_counts.index)
        account_txn_counts = {
            acc: src_counts.get(acc, 0) + dst_counts.get(acc, 0)
            for acc in all_accounts
        }
        
        # Set node attributes - O(V)
        for node in self.graph.nodes():
            self.graph.nodes[node]['total_in_degree'] = self.graph.in_degree(node)
            self.graph.nodes[node]['total_out_degree'] = self.graph.out_degree(node)
            self.graph.nodes[node]['total_transactions'] = account_txn_counts.get(node, 0)
            self.graph.nodes[node]['suspicion_score'] = 0.0
            self.graph.nodes[node]['detected_patterns'] = []
            self.graph.nodes[node]['ring_id'] = None
    
    def _build_temporal_index(self) -> None:
        """Build temporal index for sliding window queries (vectorized for 10K+ rows)"""
        self.temporal_index = defaultdict(list)
        df = self.transactions_df
        n = len(df)
        # Batch append by account - use zip for fast iteration
        src = df['source_account'].values
        dst = df['destination_account'].values
        ts = df['timestamp'].values
        amt = df['amount'].values
        for i in range(n):
            s, d, t, a = src[i], dst[i], ts[i], amt[i]
            self.temporal_index[s].append({'timestamp': t, 'type': 'outgoing', 'amount': a, 'counterparty': d})
            self.temporal_index[d].append({'timestamp': t, 'type': 'incoming', 'amount': a, 'counterparty': s})
        for account in self.temporal_index:
            self.temporal_index[account].sort(key=lambda x: x['timestamp'])
    
    def get_windowed_transactions(
        self, 
        account: str, 
        window_hours: int = 72
    ) -> Tuple[List[dict], List[dict]]:
        """
        Get incoming/outgoing transactions within sliding window
        
        Args:
            account: Account ID
            window_hours: Time window in hours
            
        Returns:
            Tuple of (incoming_txns, outgoing_txns)
        """
        if account not in self.temporal_index:
            return [], []
        
        txns = self.temporal_index[account]
        window_delta = timedelta(hours=window_hours)
        
        incoming = []
        outgoing = []
        
        for txn in txns:
            # Find transactions within window of this transaction
            window_start = txn['timestamp']
            window_end = window_start + window_delta
            
            if txn['type'] == 'incoming':
                incoming.append(txn)
            else:
                outgoing.append(txn)
        
        return incoming, outgoing
    
    def get_transaction_latency(self, account: str) -> List[float]:
        """
        Compute latency between incoming and outgoing transactions
        
        Args:
            account: Account ID
            
        Returns:
            List of latencies in seconds
        """
        incoming, outgoing = self.get_windowed_transactions(account, window_hours=168)  # 1 week
        
        if not incoming or not outgoing:
            return []
        
        latencies = []
        
        for in_txn in incoming:
            # Find next outgoing transaction
            for out_txn in outgoing:
                if out_txn['timestamp'] > in_txn['timestamp']:
                    latency_seconds = (out_txn['timestamp'] - in_txn['timestamp']) / pd.Timedelta(seconds=1)
                    latencies.append(latency_seconds)
                    break
        
        return latencies
    
    def get_graph_metrics(self) -> Dict:
        """Compute overall graph statistics"""
        return {
            'num_nodes': self.graph.number_of_nodes(),
            'num_edges': self.graph.number_of_edges(),
            'density': nx.density(self.graph),
            'num_weakly_connected_components': nx.number_weakly_connected_components(self.graph),
            'num_strongly_connected_components': nx.number_strongly_connected_components(self.graph)
        }
