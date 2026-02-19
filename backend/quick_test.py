"""
Quick test to verify RIFT pattern detection fixes
"""

import pandas as pd
from datetime import datetime, timedelta
from services.rift_aml_pipeline import RIFTAMLPipeline

# Create simple test data with fraud patterns
transactions = [
    # 3-cycle fraud ring
    {'transaction_id': 'TXN_001', 'sender_id': 'ACC_A', 'receiver_id': 'ACC_B', 'amount': 10000, 'timestamp': '2024-01-01 10:00:00'},
    {'transaction_id': 'TXN_002', 'sender_id': 'ACC_B', 'receiver_id': 'ACC_C', 'amount': 10000, 'timestamp': '2024-01-01 11:00:00'},
    {'transaction_id': 'TXN_003', 'sender_id': 'ACC_C', 'receiver_id': 'ACC_A', 'amount': 10000, 'timestamp': '2024-01-01 12:00:00'},
    
    # Fan-out pattern
    {'transaction_id': 'TXN_004', 'sender_id': 'ACC_FAN', 'receiver_id': 'ACC_DST1', 'amount': 5000, 'timestamp': '2024-01-01 13:00:00'},
    {'transaction_id': 'TXN_005', 'sender_id': 'ACC_FAN', 'receiver_id': 'ACC_DST2', 'amount': 5000, 'timestamp': '2024-01-01 14:00:00'},
    {'transaction_id': 'TXN_006', 'sender_id': 'ACC_FAN', 'receiver_id': 'ACC_DST3', 'amount': 5000, 'timestamp': '2024-01-01 15:00:00'},
    {'transaction_id': 'TXN_007', 'sender_id': 'ACC_FAN', 'receiver_id': 'ACC_DST4', 'amount': 5000, 'timestamp': '2024-01-01 16:00:00'},
    {'transaction_id': 'TXN_008', 'sender_id': 'ACC_FAN', 'receiver_id': 'ACC_DST5', 'amount': 5000, 'timestamp': '2024-01-01 17:00:00'},
]

print("🧪 Running quick RIFT test...")
df = pd.DataFrame(transactions)

try:
    pipeline = RIFTAMLPipeline()
    result = pipeline.process_transactions(df)
    
    print(f"✅ Test completed successfully!")
    print(f"🔍 Suspicious accounts: {len(result.suspicious_accounts)}")
    print(f"⭕ Fraud rings: {len(result.fraud_rings)}")
    
    # Show detected suspicious accounts
    for acc in result.suspicious_accounts:
        print(f"  📊 Account: {acc.account_id}")
        print(f"    Score: {acc.suspicion_score}")
        print(f"    Patterns: {acc.detected_patterns}")
        print(f"    Mule: {acc.is_mule} ({acc.mule_role})")
        print(f"    Ring: {acc.ring_id}")
    
    # Show fraud rings
    for ring in result.fraud_rings:
        print(f"  ⭕ Ring: {ring.ring_id}")
        print(f"    Members: {ring.member_accounts}")
        print(f"    Type: {ring.pattern_type}")
        print(f"    Risk: {ring.risk_score}")
        
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
