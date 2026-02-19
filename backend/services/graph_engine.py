"""
Core Graph Engine for Transaction Network Analysis
Temporal directed graph with efficient attribute computation
"""

import networkx as nx
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Set
from collections import defaultdict


class TransactionGraphEngine:
    """
    Temporal directed graph engine for transaction network analysis
    Optimized for memory efficiency and fast pattern detection
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self.transactions_df = None
        self.account_profiles = defaultdict(dict)
        self.temporal_index = {}
        
    def build_graph(self, transactions_df: pd.DataFrame) -> None:
        """
        Build temporal directed graph from transaction data
        
        Args:
            transactions_df: DataFrame with columns [transaction_id, source_account, 
                            destination_account, amount, timestamp]
        """
        self.transactions_df = transactions_df.copy()
        
        # Ensure timestamp is datetime
        if not pd.api.types.is_datetime64_any_dtype(self.transactions_df['timestamp']):
            self.transactions_df['timestamp'] = pd.to_datetime(
                self.transactions_df['timestamp'], 
                errors='coerce'
            )
        
        # Sort by timestamp for temporal analysis
        self.transactions_df = self.transactions_df.sort_values('timestamp')
        
        # Build nodes (accounts)
        unique_accounts = set(self.transactions_df['source_account']).union(
            set(self.transactions_df['destination_account'])
        )
        self.graph.add_nodes_from(unique_accounts)
        
        # Build edges with aggregated attributes
        self._build_edges()
        
        # Compute node features
        self._compute_node_features()
        
        # Build temporal index
        self._build_temporal_index()
        
    def _build_edges(self) -> None:
        """Build edges with transaction attributes"""
        # Group transactions by source-destination pairs
        edge_groups = self.transactions_df.groupby(['source_account', 'destination_account'])
        
        for (src, dst), group in edge_groups:
            amounts = group['amount'].values
            timestamps = group['timestamp'].values
            
            # Compute edge attributes
            edge_attrs = {
                'total_amount': float(np.sum(amounts)),
                'txn_count': len(amounts),
                'avg_amount': float(np.mean(amounts)),
                'amount_std': float(np.std(amounts)) if len(amounts) > 1 else 0.0,
                'first_txn': timestamps[0],
                'last_txn': timestamps[-1],
                'txn_frequency': self._compute_frequency(timestamps),
                'rolling_velocity': self._compute_velocity(amounts, timestamps),
                'time_decay_weight': self._compute_time_decay(timestamps),
                'amount_variance': float(np.var(amounts)) if len(amounts) > 1 else 0.0
            }
            
            self.graph.add_edge(src, dst, **edge_attrs)
    
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
    
    def _compute_node_features(self) -> None:
        """Compute account-level features"""
        for node in self.graph.nodes():
            # Incoming transactions
            in_edges = list(self.graph.in_edges(node, data=True))
            out_edges = list(self.graph.out_edges(node, data=True))
            
            in_total = sum(data['total_amount'] for _, _, data in in_edges)
            out_total = sum(data['total_amount'] for _, _, data in out_edges)
            
            in_count = sum(data['txn_count'] for _, _, data in in_edges)
            out_count = sum(data['txn_count'] for _, _, data in out_edges)
            
            # Diversity metrics (number of unique counterparties)
            in_diversity = len(in_edges)
            out_diversity = len(out_edges)
            
            self.graph.nodes[node]['total_incoming'] = in_total
            self.graph.nodes[node]['total_outgoing'] = out_total
            self.graph.nodes[node]['net_flow'] = in_total - out_total
            self.graph.nodes[node]['in_degree'] = in_diversity
            self.graph.nodes[node]['out_degree'] = out_diversity
            self.graph.nodes[node]['total_degree'] = in_diversity + out_diversity
            self.graph.nodes[node]['in_txn_count'] = in_count
            self.graph.nodes[node]['out_txn_count'] = out_count
            
            # Pass-through ratio
            if in_total > 0:
                self.graph.nodes[node]['pass_through_ratio'] = out_total / in_total
            else:
                self.graph.nodes[node]['pass_through_ratio'] = 0.0
            
            # Diversity index (higher = more diverse, likely legitimate)
            total_txns = in_count + out_count
            if total_txns > 0:
                diversity_score = (in_diversity + out_diversity) / np.sqrt(total_txns)
                self.graph.nodes[node]['diversity_index'] = min(diversity_score, 10.0)
            else:
                self.graph.nodes[node]['diversity_index'] = 0.0
    
    def _build_temporal_index(self) -> None:
        """Build temporal index for sliding window queries"""
        self.temporal_index = defaultdict(list)
        
        for _, row in self.transactions_df.iterrows():
            timestamp = row['timestamp']
            self.temporal_index[row['source_account']].append({
                'timestamp': timestamp,
                'type': 'outgoing',
                'amount': row['amount'],
                'counterparty': row['destination_account']
            })
            self.temporal_index[row['destination_account']].append({
                'timestamp': timestamp,
                'type': 'incoming',
                'amount': row['amount'],
                'counterparty': row['source_account']
            })
        
        # Sort by timestamp
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
