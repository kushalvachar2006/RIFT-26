"""
10K Transaction Performance Test for RIFT 2026
Tests backend performance with 10,000 transactions
"""

import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from services.rift_aml_pipeline import RIFTAMLPipeline


def generate_10k_dataset():
    """Generate 10,000 transactions with mixed patterns"""
    
    print("🧪 Generating 10K transaction performance test dataset...")
    
    transactions = []
    txn_id = 1
    base_time = datetime.now() - timedelta(days=30)
    
    # Create account pool
    accounts = [f"ACC_{i:06d}" for i in range(1, 3001)]  # 3000 unique accounts
    
    # 1. Add fraud patterns (20% of data)
    print("  📊 Adding fraud patterns (20%)...")
    
    # Fraud rings (5 cycles)
    for ring_idx in range(5):
        ring_size = np.random.randint(3, 6)
        ring_accounts = np.random.choice(accounts, ring_size, replace=False)
        
        for i in range(ring_size):
            src = ring_accounts[i]
            dst = ring_accounts[(i + 1) % ring_size]
            
            for cycle in range(2):  # 2 cycles per ring
                transactions.append({
                    'transaction_id': f'TXN_{txn_id:06d}',
                    'sender_id': src,
                    'receiver_id': dst,
                    'amount': np.random.uniform(8000, 15000),
                    'timestamp': (base_time + timedelta(hours=txn_id*0.1)).strftime('%Y-%m-%d %H:%M:%S')
                })
                txn_id += 1
    
    # High velocity accounts (10 accounts)
    hv_accounts = np.random.choice(accounts, 10, replace=False)
    for account in hv_accounts:
        for i in range(20):  # 20 rapid transactions each
            dst = np.random.choice(accounts)
            while dst == account:
                dst = np.random.choice(accounts)
            
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': dst,
                'amount': np.random.uniform(5000, 12000),
                'timestamp': (base_time + timedelta(minutes=i*5)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # Fan-out patterns (5 accounts)
    fo_accounts = np.random.choice(accounts, 5, replace=False)
    for account in fo_accounts:
        for i in range(15):  # 15 destinations each
            dst = np.random.choice(accounts)
            while dst == account:
                dst = np.random.choice(accounts)
            
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': dst,
                'amount': np.random.uniform(3000, 8000),
                'timestamp': (base_time + timedelta(hours=i*2)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # 2. Add normal transactions (80% of data)
    print("  📊 Adding normal transactions (80%)...")
    
    remaining_txns = 10000 - len(transactions)
    
    for i in range(remaining_txns):
        src = np.random.choice(accounts)
        dst = np.random.choice(accounts)
        while dst == src:
            dst = np.random.choice(accounts)
        
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': np.random.uniform(100, 5000),
            'timestamp': (base_time + timedelta(
                days=np.random.randint(0, 30),
                hours=np.random.randint(0, 23),
                minutes=np.random.randint(0, 59)
            )).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    df = pd.DataFrame(transactions[:10000])  # Ensure exactly 10K
    print(f"✅ Generated {len(df)} transactions with {len(set(df['sender_id']).union(set(df['receiver_id'])))} unique accounts")
    
    return df


def test_10k_performance():
    """Test RIFT pipeline performance with 10K transactions"""
    
    print("=" * 80)
    print("🚀 RIFT 2026 10K TRANSACTION PERFORMANCE TEST")
    print("=" * 80)
    
    # Generate test data
    test_df = generate_10k_dataset()
    
    # Save to CSV for manual testing
    test_df.to_csv('test_10k_transactions.csv', index=False)
    print(f"💾 Saved test dataset to 'test_10k_transactions.csv'")
    
    # Run RIFT pipeline
    print(f"\n🔥 Running RIFT AML pipeline on 10K transactions...")
    start_time = time.time()
    
    pipeline = RIFTAMLPipeline()
    result = pipeline.process_transactions(test_df)
    
    processing_time = time.time() - start_time
    
    # Performance analysis
    print(f"\n⏱️  PERFORMANCE RESULTS")
    print("-" * 40)
    print(f"  📊 Dataset size: {len(test_df):,} transactions")
    print(f"  👥 Unique accounts: {len(set(test_df['sender_id']).union(set(test_df['receiver_id']))):,}")
    print(f"  ⏱️  Processing time: {processing_time:.2f} seconds")
    print(f"  🎯 RIFT target: ≤30 seconds")
    
    # Performance compliance
    time_compliant = processing_time <= 30.0
    print(f"  ✅ Time compliance: {'PASS' if time_compliant else 'FAIL'}")
    
    if not time_compliant:
        print(f"     ⚠️  Exceeds target by {processing_time - 30.0:.2f} seconds")
    
    # Detection results
    print(f"\n🔍 DETECTION RESULTS")
    print("-" * 40)
    print(f"  🔍 Suspicious accounts: {len(result.suspicious_accounts)}")
    print(f"  ⭕ Fraud rings: {len(result.fraud_rings)}")
    print(f"  📈 Suspicious rate: {len(result.suspicious_accounts) / len(set(test_df['sender_id']).union(set(test_df['receiver_id'])) * 100:.1f}%")
    
    # High-risk accounts
    high_risk = [acc for acc in result.suspicious_accounts if acc.suspicion_score >= 80]
    print(f"  🚨 High-risk accounts (≥80): {len(high_risk)}")
    
    # Pattern coverage
    all_patterns = set()
    for acc in result.suspicious_accounts:
        all_patterns.update(acc.detected_patterns)
    print(f"  🎯 Patterns detected: {list(all_patterns)}")
    
    # Performance metrics
    print(f"\n📈 PERFORMANCE METRICS")
    print("-" * 40)
    transactions_per_second = len(test_df) / processing_time
    print(f"  ⚡ Throughput: {transactions_per_second:.1f} transactions/second")
    
    if time_compliant:
        print(f"  🏆 RIFT 2026 PERFORMANCE REQUIREMENT: ✅ MET")
    else:
        print(f"  ❌ RIFT 2026 PERFORMANCE REQUIREMENT: ❌ NOT MET")
    
    print(f"\n📋 SUMMARY")
    print("-" * 40)
    print(f"  Processing Time: {processing_time:.2f}s (Target: ≤30s)")
    print(f"  Dataset Size: {len(test_df):,} transactions")
    print(f"  Detection Rate: {len(result.suspicious_accounts)} suspicious accounts")
    print(f"  Pattern Coverage: {len(all_patterns)} different patterns")
    print(f"  Overall Status: {'COMPLIANT' if time_compliant else 'NON-COMPLIANT'}")
    
    return {
        'processing_time': processing_time,
        'compliant': time_compliant,
        'transactions': len(test_df),
        'suspicious_accounts': len(result.suspicious_accounts),
        'fraud_rings': len(result.fraud_rings),
        'throughput': transactions_per_second
    }


if __name__ == "__main__":
    test_10k_performance()
