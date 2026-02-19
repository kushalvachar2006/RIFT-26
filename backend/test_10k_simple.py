"""
Simple 10K Performance Test for RIFT 2026
"""

import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from services.rift_aml_pipeline import RIFTAMLPipeline

def generate_10k_simple():
    """Generate 10K transactions quickly"""
    print("🧪 Generating 10K transactions...")
    
    transactions = []
    accounts = [f"ACC_{i:06d}" for i in range(1, 3001)]
    base_time = datetime.now() - timedelta(days=30)
    
    # Add fraud patterns (20%)
    # 3-cycle
    for i in range(100):
        cycle = np.random.choice(accounts, 3, replace=False)
        for j in range(3):
            src = cycle[j]
            dst = cycle[(j + 1) % 3]
            transactions.append({
                'transaction_id': f'TXN_{len(transactions)+1:06d}',
                'sender_id': src,
                'receiver_id': dst,
                'amount': np.random.uniform(8000, 15000),
                'timestamp': (base_time + timedelta(minutes=len(transactions)*0.1)).strftime('%Y-%m-%d %H:%M:%S')
            })
    
    # Fan-out
    for i in range(50):
        sender = np.random.choice(accounts)
        for j in range(10):
            dst = np.random.choice(accounts)
            while dst == sender:
                dst = np.random.choice(accounts)
            transactions.append({
                'transaction_id': f'TXN_{len(transactions)+1:06d}',
                'sender_id': sender,
                'receiver_id': dst,
                'amount': np.random.uniform(3000, 8000),
                'timestamp': (base_time + timedelta(hours=i*2, minutes=j*5)).strftime('%Y-%m-%d %H:%M:%S')
            })
    
    # Normal transactions (80%)
    remaining = 10000 - len(transactions)
    for i in range(remaining):
        src = np.random.choice(accounts)
        dst = np.random.choice(accounts)
        while dst == src:
            dst = np.random.choice(accounts)
        transactions.append({
            'transaction_id': f'TXN_{len(transactions)+1:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': np.random.uniform(100, 5000),
            'timestamp': (base_time + timedelta(
                days=np.random.randint(0, 30),
                hours=np.random.randint(0, 23)
            )).strftime('%Y-%m-%d %H:%M:%S')
        })
    
    df = pd.DataFrame(transactions[:10000])
    print(f"✅ Generated {len(df)} transactions")
    return df

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 RIFT 10K PERFORMANCE TEST")
    print("=" * 60)
    
    # Generate test data
    test_df = generate_10k_simple()
    
    # Run RIFT pipeline
    print(f"\n🔥 Running RIFT AML pipeline...")
    start_time = time.time()
    
    pipeline = RIFTAMLPipeline()
    result = pipeline.process_transactions(test_df)
    
    processing_time = time.time() - start_time
    
    print(f"\n⏱️  RESULTS:")
    print(f"  📊 Transactions: {len(test_df):,}")
    print(f"  ⏱️  Processing Time: {processing_time:.2f} seconds")
    print(f"  🔍 Suspicious Accounts: {len(result.suspicious_accounts)}")
    print(f"  ⭕ Fraud Rings: {len(result.fraud_rings)}")
    print(f"  🎯 Performance Target: ≤30 seconds")
    print(f"  ✅ Status: {'PASS' if processing_time <= 30 else 'FAIL'}")
    
    # Show suspicious accounts
    if result.suspicious_accounts:
        print(f"\n🔍 SUSPICIOUS ACCOUNTS:")
        for acc in result.suspicious_accounts[:5]:  # Show first 5
            print(f"  📊 {acc.account_id}: Score {acc.suspicion_score}, Mule: {acc.is_mule} ({acc.mule_role})")
    
    # Show fraud rings
    if result.fraud_rings:
        print(f"\n⭕ FRAUD RINGS:")
        for ring in result.fraud_rings:
            print(f"  ⭕ {ring.ring_id}: {len(ring.member_accounts)} members, Risk {ring.risk_score}")
