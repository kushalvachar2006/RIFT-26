"""
RIFT 2026 Compliance Test Suite
Tests all 8 detection patterns and JSON format compliance
"""

import time
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
from services.rift_aml_pipeline import RIFTAMLPipeline


def generate_rift_test_dataset():
    """Generate comprehensive test dataset with all 8 fraud patterns"""
    
    print("🧪 Generating RIFT compliance test dataset...")
    
    transactions = []
    txn_id = 1
    
    # Pattern 1: Circular Fund Routing (Cycles) - 3, 4, 5 length cycles
    print("  📊 Adding circular fund routing patterns...")
    
    # 3-cycle (triangle)
    cycle_3 = ["ACC_CYC3_1", "ACC_CYC3_2", "ACC_CYC3_3"]
    for i in range(3):
        src = cycle_3[i]
        dst = cycle_3[(i + 1) % 3]
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': 12000.00,
            'timestamp': (datetime.now() - timedelta(hours=i)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # 4-cycle (square)
    cycle_4 = ["ACC_CYC4_1", "ACC_CYC4_2", "ACC_CYC4_3", "ACC_CYC4_4"]
    for i in range(4):
        src = cycle_4[i]
        dst = cycle_4[(i + 1) % 4]
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': 15000.00,
            'timestamp': (datetime.now() - timedelta(hours=i+10)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # Pattern 2: Smurfing (Fan-In Pattern) - 15 senders to 1 receiver
    print("  📊 Adding fan-in smurfing pattern...")
    fan_in_receiver = "ACC_FAN_IN_TARGET"
    for i in range(15):
        sender = f"ACC_FAN_IN_{i:02d}"
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': sender,
            'receiver_id': fan_in_receiver,
            'amount': 5000.00,
            'timestamp': (datetime.now() - timedelta(hours=i*2, minutes=30)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # Pattern 3: Smurfing (Fan-Out Pattern) - 1 sender to 12 receivers
    print("  📊 Adding fan-out smurfing pattern...")
    fan_out_sender = "ACC_FAN_OUT_SOURCE"
    for i in range(12):
        receiver = f"ACC_FAN_OUT_{i:02d}"
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': fan_out_sender,
            'receiver_id': receiver,
            'amount': 8000.00,
            'timestamp': (datetime.now() - timedelta(hours=i*3, minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # Pattern 4: Layered Shell Networks (Multi-hop Chains)
    print("  📊 Adding layered shell network chains...")
    shell_chains = [
        ["ACC_SHELL_A", "ACC_SHELL_B", "ACC_SHELL_C", "ACC_SHELL_D"],  # 4-hop chain
        ["ACC_CHAIN_1", "ACC_CHAIN_2", "ACC_CHAIN_3"],  # 3-hop chain
        ["ACC_LAYER_X", "ACC_LAYER_Y", "ACC_LAYER_Z", "ACC_LAYER_W", "ACC_LAYER_V"]  # 5-hop chain
    ]
    
    for chain in shell_chains:
        for i in range(len(chain) - 1):
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': chain[i],
                'receiver_id': chain[i+1],
                'amount': 20000.00,
                'timestamp': (datetime.now() - timedelta(hours=i*4, minutes=45)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # Pattern 5: High Velocity Fund Transfers (< 30 minutes)
    print("  📊 Adding high velocity transfer patterns...")
    hv_accounts = ["ACC_HV_1", "ACC_HV_2", "ACC_HV_3"]
    for account in hv_accounts:
        # Incoming transaction
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': f"ACC_SOURCE_{account}",
            'receiver_id': account,
            'amount': 25000.00,
            'timestamp': (datetime.now() - timedelta(minutes=45)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
        
        # Rapid outgoing (< 30 min)
        for i in range(3):
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': f"ACC_DEST_{account}_{i}",
                'amount': 8000.00,
                'timestamp': (datetime.now() - timedelta(minutes=20-i*5)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # Pattern 6: Pass-Through / Rapid Forwarding Behavior
    print("  📊 Adding pass-through behavior...")
    pt_accounts = ["ACC_PT_1", "ACC_PT_2"]
    for account in pt_accounts:
        # Multiple incoming
        total_in = 0.0
        for i in range(5):
            amount = 10000.00
            total_in += amount
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': f"ACC_PT_SOURCE_{i}",
                'receiver_id': account,
                'amount': amount,
                'timestamp': (datetime.now() - timedelta(hours=i*2)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
        
        # Forward almost all (ratio ≈ 1)
        for i in range(4):
            amount = total_in * 0.24  # 96% forwarded
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': account,
                'receiver_id': f"ACC_PT_DEST_{i}",
                'amount': amount,
                'timestamp': (datetime.now() - timedelta(hours=i*2+1)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # Pattern 7: Transaction Burst Pattern (Temporal Anomaly)
    print("  📊 Adding transaction burst patterns...")
    burst_account = "ACC_BURST_1"
    
    # Normal baseline (1-2 transactions per hour)
    for i in range(10):
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': burst_account,
            'receiver_id': f"ACC_NORMAL_{i}",
            'amount': 1000.00,
            'timestamp': (datetime.now() - timedelta(hours=i*24)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # Burst (10+ transactions in 1 hour)
    for i in range(12):
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': burst_account,
            'receiver_id': f"ACC_BURST_{i}",
            'amount': 1500.00,
            'timestamp': (datetime.now() - timedelta(minutes=i*5)).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    # Pattern 8: Risk Propagation setup (connected to suspicious nodes)
    print("  📊 Adding risk propagation network...")
    propagation_seeds = ["ACC_PROP_1", "ACC_PROP_2"]
    for seed in propagation_seeds:
        # Make seeds suspicious (already covered by other patterns)
        for i in range(3):
            neighbor = f"ACC_PROP_NEIGHBOR_{seed}_{i}"
            transactions.append({
                'transaction_id': f'TXN_{txn_id:06d}',
                'sender_id': seed,
                'receiver_id': neighbor,
                'amount': 3000.00,
                'timestamp': (datetime.now() - timedelta(hours=i)).strftime('%Y-%m-%d %H:%M:%S')
            })
            txn_id += 1
    
    # Add normal transactions for baseline
    print("  📊 Adding normal transactions...")
    for i in range(50):
        src = f"ACC_NORMAL_SRC_{i}"
        dst = f"ACC_NORMAL_DST_{i}"
        transactions.append({
            'transaction_id': f'TXN_{txn_id:06d}',
            'sender_id': src,
            'receiver_id': dst,
            'amount': np.random.uniform(100, 2000),
            'timestamp': (datetime.now() - timedelta(days=np.random.randint(1, 30))).strftime('%Y-%m-%d %H:%M:%S')
        })
        txn_id += 1
    
    df = pd.DataFrame(transactions)
    print(f"✅ Generated {len(df)} transactions with {len(set(df['sender_id']).union(set(df['receiver_id'])))} unique accounts")
    
    return df


def test_rift_compliance():
    """Test complete RIFT 2026 compliance"""
    
    print("=" * 80)
    print("🏁 RIFT 2026 COMPLIANCE TEST SUITE")
    print("=" * 80)
    
    # Generate test data
    test_df = generate_rift_test_dataset()
    
    # Run RIFT pipeline
    print(f"\n🚀 Running RIFT AML pipeline...")
    start_time = time.time()
    
    pipeline = RIFTAMLPipeline()
    result = pipeline.process_transactions(test_df)
    
    processing_time = time.time() - start_time
    
    print(f"⏱️  Processing time: {processing_time:.2f} seconds")
    
    # Test 1: JSON Format Compliance
    print(f"\n📋 Test 1: JSON Format Compliance")
    print("-" * 40)
    
    # Convert to JSON and validate structure
    result_dict = result.model_dump()
    
    required_keys = ['suspicious_accounts', 'fraud_rings', 'summary']
    json_compliant = all(key in result_dict for key in required_keys)
    
    print(f"  ✅ Required top-level keys: {'PASS' if json_compliant else 'FAIL'}")
    
    # Check suspicious accounts format
    if result_dict['suspicious_accounts']:
        sample_account = result_dict['suspicious_accounts'][0]
        account_keys = ['account_id', 'suspicion_score', 'detected_patterns', 'ring_id']
        account_compliant = all(key in sample_account for key in account_keys)
        print(f"  ✅ Suspicious account format: {'PASS' if account_compliant else 'FAIL'}")
        
        # Check sorting by score (DESC)
        scores = [acc['suspicion_score'] for acc in result_dict['suspicious_accounts']]
        sorted_correct = scores == sorted(scores, reverse=True)
        print(f"  ✅ Sorted by suspicion_score DESC: {'PASS' if sorted_correct else 'FAIL'}")
    
    # Check fraud rings format
    if result_dict['fraud_rings']:
        sample_ring = result_dict['fraud_rings'][0]
        ring_keys = ['ring_id', 'member_accounts', 'pattern_type', 'risk_score']
        ring_compliant = all(key in sample_ring for key in ring_keys)
        print(f"  ✅ Fraud ring format: {'PASS' if ring_compliant else 'FAIL'}")
    
    # Check summary format
    summary_keys = ['total_accounts_analyzed', 'suspicious_accounts_flagged', 'fraud_rings_detected', 'processing_time_seconds']
    summary_compliant = all(key in result_dict['summary'] for key in summary_keys)
    print(f"  ✅ Summary format: {'PASS' if summary_compliant else 'FAIL'}")
    
    # Test 2: Pattern Detection Coverage
    print(f"\n🔍 Test 2: Pattern Detection Coverage")
    print("-" * 40)
    
    expected_patterns = [
        'cycle_length_3', 'cycle_length_4', 'cycle_length_5',
        'fan_in', 'fan_out', 'shell_chain', 'high_velocity',
        'pass_through', 'transaction_burst', 'risk_propagation'
    ]
    
    detected_patterns = set()
    for account in result_dict['suspicious_accounts']:
        detected_patterns.update(account['detected_patterns'])
    
    pattern_coverage = len(detected_patterns.intersection(expected_patterns)) / len(expected_patterns) * 100
    print(f"  📊 Pattern coverage: {pattern_coverage:.1f}% ({len(detected_patterns.intersection(expected_patterns))}/{len(expected_patterns)})")
    print(f"  🎯 Expected patterns: {expected_patterns}")
    print(f"  ✅ Detected patterns: {list(detected_patterns)}")
    
    # Test 3: Fraud Ring Detection
    print(f"\n⭕ Test 3: Fraud Ring Detection")
    print("-" * 40)
    
    rings_detected = len(result_dict['fraud_rings'])
    print(f"  📊 Fraud rings detected: {rings_detected}")
    
    # Check for cycle rings
    cycle_rings = [ring for ring in result_dict['fraud_rings'] if ring['pattern_type'] == 'cycle']
    print(f"  ⭕ Cycle rings: {len(cycle_rings)}")
    
    # Check ring ID consistency
    ring_ids = set()
    account_ring_mapping = {}
    for ring in result_dict['fraud_rings']:
        ring_ids.add(ring['ring_id'])
        for account in ring['member_accounts']:
            account_ring_mapping[account] = ring['ring_id']
    
    # Verify suspicious accounts have consistent ring IDs
    ring_consistency = True
    for account in result_dict['suspicious_accounts']:
        if account['ring_id']:
            if account['account_id'] in account_ring_mapping:
                if account['ring_id'] != account_ring_mapping[account['account_id']]:
                    ring_consistency = False
                    break
    
    print(f"  ✅ Ring ID consistency: {'PASS' if ring_consistency else 'FAIL'}")
    
    # Test 4: Performance Requirements
    print(f"\n⚡ Test 4: Performance Requirements")
    print("-" * 40)
    
    time_compliant = processing_time <= 30.0
    print(f"  ⏱️  Processing time ≤30s: {'PASS' if time_compliant else 'FAIL'} ({processing_time:.2f}s)")
    
    # Test 5: False Positive Control
    print(f"\n🛡️ Test 5: False Positive Control")
    print("-" * 40)
    
    total_accounts = result_dict['summary']['total_accounts_analyzed']
    suspicious_accounts = result_dict['summary']['suspicious_accounts_flagged']
    suspicious_rate = suspicious_accounts / total_accounts * 100
    
    precision_target_met = suspicious_rate <= 30.0  # Target: ≤30% suspicious rate
    print(f"  🎯 Suspicious rate: {suspicious_rate:.1f}% ({suspicious_accounts}/{total_accounts})")
    print(f"  ✅ Precision target ≤30%: {'PASS' if precision_target_met else 'FAIL'}")
    
    # Test 6: Quality Metrics
    print(f"\n📈 Test 6: Quality Metrics")
    print("-" * 40)
    
    # High suspicion accounts (>80)
    high_suspicion = [acc for acc in result_dict['suspicious_accounts'] if acc['suspicion_score'] >= 80]
    print(f"  🚨 High suspicion accounts (≥80): {len(high_suspicion)}")
    
    # Accounts with multiple patterns
    multi_pattern = [acc for acc in result_dict['suspicious_accounts'] if len(acc['detected_patterns']) > 1]
    print(f"  🔗 Multi-pattern accounts: {len(multi_pattern)}")
    
    # Overall compliance score
    print(f"\n🏆 Overall RIFT Compliance Score")
    print("-" * 40)
    
    compliance_factors = [
        json_compliant,
        pattern_coverage >= 70.0,
        rings_detected >= 2,
        ring_consistency,
        time_compliant,
        precision_target_met
    ]
    
    compliance_score = sum(compliance_factors) / len(compliance_factors) * 100
    print(f"  📊 Compliance Score: {compliance_score:.1f}%")
    print(f"  🏆 Status: {'PASS' if compliance_score >= 80 else 'FAIL'}")
    
    # Detailed results
    print(f"\n📋 Detailed Results Summary")
    print("-" * 40)
    print(f"  📊 Total transactions: {len(test_df)}")
    print(f"  👥 Total accounts: {total_accounts}")
    print(f"  🔍 Suspicious accounts: {suspicious_accounts}")
    print(f"  ⭕ Fraud rings: {rings_detected}")
    print(f"  ⏱️  Processing time: {processing_time:.2f}s")
    print(f"  🎯 Suspicious rate: {suspicious_rate:.1f}%")
    print(f"  🚨 High suspicion: {len(high_suspicion)}")
    print(f"  🔗 Multi-pattern: {len(multi_pattern)}")
    
    return result_dict, compliance_score


if __name__ == "__main__":
    test_rift_compliance()
