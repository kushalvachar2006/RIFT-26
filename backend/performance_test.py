import time
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from services.aml_pipeline import AMLPipeline

def generate_large_dataset(num_transactions=10000):
    """Generate a large dataset with fraud patterns for performance testing"""
    
    print(f"Generating {num_transactions} transactions...")
    
    # Create account pools
    accounts = [f"ACC_{i:06d}" for i in range(1, 5001)]  # 5000 unique accounts
    
    transactions = []
    txn_id = 1
    
    # 1. Create multiple fraud rings (5% of transactions)
    num_rings = 10
    for ring_idx in range(num_rings):
        ring_size = np.random.randint(3, 6)
        ring_accounts = np.random.choice(accounts, ring_size, replace=False)
        
        # Create circular transactions
        for cycle in range(5):  # 5 cycles per ring
            for i in range(ring_size):
                src = ring_accounts[i]
                dst = ring_accounts[(i + 1) % ring_size]
                amount = np.random.uniform(8000, 15000)
                timestamp = datetime.now() - timedelta(hours=np.random.uniform(0, 72))
                
                transactions.append({
                    'transaction_id': f'TXN_{txn_id:06d}',
                    'sender_id': src,
                    'receiver_id': dst,
                    'amount': amount,
                    'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
                })
                txn_id += 1
    
    # 2. High velocity accounts (10% of transactions)
    high_velocity_accounts = np.random.choice(accounts, 50, replace=False)
    for account in high_velocity_accounts:
        for i in range(20):  # 20 rapid transactions each
            dst = np.random.choice(accounts)
            while dst == account:
                dst = np.random.choice(accounts)
            
            amount = np.random.uniform(1000, 5000)
            timestamp = datetime.now() - timedelta(minutes=np.random.uniform(0, 120))
            
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': dst,
                'amount': amount,
                'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # 3. Fan-out patterns (5% of transactions)
    fan_accounts = np.random.choice(accounts, 20, replace=False)
    for account in fan_accounts:
        for i in range(25):  # 25 destinations each
            dst = np.random.choice(accounts)
            while dst == account:
                dst = np.random.choice(accounts)
            
            amount = np.random.uniform(5000, 12000)
            timestamp = datetime.now() - timedelta(hours=np.random.uniform(0, 48))
            
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': dst,
                'amount': amount,
                'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # 4. Normal transactions (80% of transactions)
    remaining_txns = num_transactions - len(transactions)
    for i in range(remaining_txns):
        src = np.random.choice(accounts)
        dst = np.random.choice(accounts)
        while dst == src:
            dst = np.random.choice(accounts)
        
        amount = np.random.uniform(100, 3000)
        timestamp = datetime.now() - timedelta(days=np.random.uniform(0, 30))
        
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': amount,
            'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    df = pd.DataFrame(transactions)
    print(f"Generated {len(df)} transactions with {len(set(df['sender_id']).union(set(df['receiver_id'])))} unique accounts")
    
    return df

def test_performance():
    """Test backend performance against RIFT requirements"""
    
    print("=" * 80)
    print("RIFT 2026 PERFORMANCE COMPLIANCE TEST")
    print("=" * 80)
    
    # Test different dataset sizes
    test_sizes = [1000, 5000, 10000]
    
    for size in test_sizes:
        print(f"\n🧪 Testing {size:,} transactions...")
        
        # Generate test data
        df = generate_large_dataset(size)
        
        # Run pipeline
        start_time = time.time()
        pipeline = AMLPipeline()
        result = pipeline.process_transactions(df)
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Calculate metrics
        total_accounts = len(set(df['sender_id']).union(set(df['receiver_id'])))
        suspicious_rate = len(result.suspicious_accounts) / total_accounts * 100
        fraud_rings = len(result.fraud_rings)
        critical_accounts = len([acc for acc in result.suspicious_accounts if acc.risk_level == 'CRITICAL'])
        
        # Performance analysis
        print(f"  ⏱️  Processing time: {processing_time:.2f} seconds")
        print(f"  📊 Dataset size: {len(df):,} transactions, {total_accounts:,} accounts")
        print(f"  🔍 Suspicious accounts: {len(result.suspicious_accounts)} ({suspicious_rate:.1f}%)")
        print(f"  ⭕ Fraud rings: {fraud_rings}")
        print(f"  🚨 Critical accounts: {critical_accounts}")
        
        # RIFT compliance check
        time_compliant = processing_time <= 30
        precision_ok = suspicious_rate <= 30  # Target: ≤30% suspicious rate
        recall_ok = fraud_rings >= 5  # Target: Detect multiple fraud rings
        
        print(f"  ✅ Time compliance: {'PASS' if time_compliant else 'FAIL'} (≤30s)")
        print(f"  🎯 Precision target: {'PASS' if precision_ok else 'FAIL'} (≤30% suspicious)")
        print(f"  📈 Recall target: {'PASS' if recall_ok else 'FAIL'} (≥5 rings)")
        
        overall_status = "PASS" if all([time_compliant, precision_ok, recall_ok]) else "FAIL"
        print(f"  🏆 Overall status: {overall_status}")
        
        if not time_compliant:
            print(f"     ⚠️  Exceeds RIFT time limit by {processing_time - 30:.2f} seconds")
    
    print("\n" + "=" * 80)
    print("PERFORMANCE TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    test_performance()
