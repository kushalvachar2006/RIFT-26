"""
Utility functions for AML detection
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict
import random


def generate_sample_transactions(
    num_transactions: int = 1000,
    num_accounts: int = 200,
    fraud_rings: int = 3,
    mule_accounts: int = 10
) -> pd.DataFrame:
    """
    Generate sample transaction data for testing
    Includes both legitimate and suspicious patterns
    
    Args:
        num_transactions: Total number of transactions
        num_accounts: Total number of accounts
        fraud_rings: Number of fraud rings to generate
        mule_accounts: Number of money mule accounts
        
    Returns:
        DataFrame with transaction data
    """
    transactions = []
    txn_id = 1
    
    # Generate base timestamp
    base_time = datetime.now() - timedelta(days=30)
    
    # Create account pools
    all_accounts = [f"ACC_{i:04d}" for i in range(1, num_accounts + 1)]
    normal_accounts = all_accounts[:num_accounts - mule_accounts - fraud_rings * 3]
    
    # Generate fraud rings (cycles)
    fraud_ring_accounts = []
    for ring_idx in range(fraud_rings):
        ring_size = random.randint(3, 5)
        ring_start = num_accounts - mule_accounts - (ring_idx + 1) * ring_size
        ring = all_accounts[ring_start:ring_start + ring_size]
        fraud_ring_accounts.extend(ring)
        
        # Create circular transactions in ring
        for i in range(ring_size):
            src = ring[i]
            dst = ring[(i + 1) % ring_size]
            
            # Multiple transactions in the cycle
            for _ in range(random.randint(3, 8)):
                amount = random.uniform(5000, 25000)
                timestamp = base_time + timedelta(
                    hours=random.uniform(0, 720),  # 30 days
                    minutes=random.uniform(0, 60)
                )
                
                transactions.append({
                    'transaction_id': f"TXN_{txn_id:06d}",
                    'source_account': src,
                    'destination_account': dst,
                    'amount': round(amount, 2),
                    'timestamp': timestamp
                })
                txn_id += 1
    
    # Generate money mule patterns (pass-through)
    mule_accounts_list = all_accounts[num_accounts - mule_accounts:num_accounts]
    for mule in mule_accounts_list:
        # Rapid in-out pattern
        num_mule_txns = random.randint(5, 15)
        
        for _ in range(num_mule_txns):
            # Incoming
            src = random.choice(normal_accounts)
            amount = random.uniform(3000, 15000)
            in_time = base_time + timedelta(hours=random.uniform(0, 720))
            
            transactions.append({
                'transaction_id': f"TXN_{txn_id:06d}",
                'source_account': src,
                'destination_account': mule,
                'amount': round(amount, 2),
                'timestamp': in_time
            })
            txn_id += 1
            
            # Outgoing (short latency)
            dst = random.choice(normal_accounts)
            out_time = in_time + timedelta(minutes=random.uniform(5, 120))
            
            transactions.append({
                'transaction_id': f"TXN_{txn_id:06d}",
                'source_account': mule,
                'destination_account': dst,
                'amount': round(amount * 0.95, 2),  # Slight reduction
                'timestamp': out_time
            })
            txn_id += 1
    
    # Fill remaining with normal transactions
    remaining = num_transactions - len(transactions)
    
    for _ in range(remaining):
        src = random.choice(normal_accounts)
        dst = random.choice(normal_accounts)
        
        if src == dst:
            continue
        
        amount = random.uniform(100, 5000)
        timestamp = base_time + timedelta(
            hours=random.uniform(0, 720)
        )
        
        transactions.append({
            'transaction_id': f"TXN_{txn_id:06d}",
            'source_account': src,
            'destination_account': dst,
            'amount': round(amount, 2),
            'timestamp': timestamp
        })
        txn_id += 1
    
    # Create DataFrame
    df = pd.DataFrame(transactions)
    
    # Sort by timestamp
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    return df


def export_to_csv(df: pd.DataFrame, filename: str = "transactions.csv") -> None:
    """
    Export DataFrame to CSV file
    
    Args:
        df: Transaction DataFrame
        filename: Output filename
    """
    df.to_csv(filename, index=False)
    print(f"Exported {len(df)} transactions to {filename}")


def format_currency(amount: float) -> str:
    """Format amount as currency"""
    return f"${amount:,.2f}"


def format_timestamp(ts: datetime) -> str:
    """Format timestamp as readable string"""
    return ts.strftime("%Y-%m-%d %H:%M:%S")


def compute_graph_density_threshold(num_nodes: int) -> float:
    """
    Compute expected graph density threshold
    
    Args:
        num_nodes: Number of nodes in graph
        
    Returns:
        Expected density threshold
    """
    # For transaction networks, density is typically low
    # Random network: d = 2m / n(n-1) ≈ p
    # Typical transaction networks have density < 0.01
    
    if num_nodes < 100:
        return 0.05
    elif num_nodes < 1000:
        return 0.01
    else:
        return 0.005


def validate_transaction_data(df: pd.DataFrame) -> Dict[str, any]:
    """
    Validate transaction data quality
    
    Args:
        df: Transaction DataFrame
        
    Returns:
        Validation report
    """
    report = {
        'valid': True,
        'errors': [],
        'warnings': [],
        'stats': {}
    }
    
    # Check required columns
    required_cols = ['transaction_id', 'source_account', 'destination_account', 'amount', 'timestamp']
    missing_cols = set(required_cols) - set(df.columns)
    
    if missing_cols:
        report['valid'] = False
        report['errors'].append(f"Missing columns: {missing_cols}")
        return report
    
    # Check for duplicates
    duplicates = df['transaction_id'].duplicated().sum()
    if duplicates > 0:
        report['warnings'].append(f"{duplicates} duplicate transaction IDs found")
    
    # Check for null values
    null_counts = df[required_cols].isnull().sum()
    if null_counts.any():
        report['warnings'].append(f"Null values found: {null_counts[null_counts > 0].to_dict()}")
    
    # Check for negative amounts
    negative_amounts = (df['amount'] <= 0).sum()
    if negative_amounts > 0:
        report['warnings'].append(f"{negative_amounts} transactions with non-positive amounts")
    
    # Check for self-loops
    self_loops = (df['source_account'] == df['destination_account']).sum()
    if self_loops > 0:
        report['warnings'].append(f"{self_loops} self-loop transactions found")
    
    # Stats
    report['stats'] = {
        'total_transactions': len(df),
        'unique_sources': df['source_account'].nunique(),
        'unique_destinations': df['destination_account'].nunique(),
        'total_amount': df['amount'].sum(),
        'avg_amount': df['amount'].mean(),
        'date_range': f"{df['timestamp'].min()} to {df['timestamp'].max()}"
    }
    
    return report
