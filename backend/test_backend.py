import time
import pandas as pd
from services.aml_pipeline import AMLPipeline

# Test with the advanced fraud patterns
df = pd.read_csv('../advanced_fraud_patterns.csv')
print(f'Testing with {len(df)} transactions...')
sender_accounts = set(df['source_account'])
receiver_accounts = set(df['destination_account'])
all_accounts = sender_accounts.union(receiver_accounts)
print(f'Accounts: {len(all_accounts)}')

start_time = time.time()
pipeline = AMLPipeline()
result = pipeline.process_transactions(df)
end_time = time.time()

print(f'Processing time: {end_time - start_time:.2f} seconds')
print(f'Suspicious accounts: {len(result.suspicious_accounts)}')
print(f'Fraud rings: {len(result.fraud_rings)}')
print(f'High risk accounts: {result.summary.high_risk_accounts}')

# Show detected patterns
print("\nTop 5 Suspicious Accounts:")
for account in result.suspicious_accounts[:5]:
    print(f'  Account {account.account_id}: Score {account.suspicion_score} - Patterns: {account.patterns}')

print("\nDetected Fraud Rings:")
for ring in result.fraud_rings:
    print(f'  Ring {ring.ring_id}: {len(ring.accounts)} accounts, Risk: {ring.risk_level}')

# Check performance requirements
print(f"\nPerformance Analysis:")
print(f"  Processing time: {end_time - start_time:.2f} seconds (Target: ≤30s)")
print(f"  Dataset size: {len(df)} transactions")
print(f"  Suspicious detection rate: {len(result.suspicious_accounts)/len(all_accounts)*100:.1f}%")
print(f"  Fraud ring detection: {len(result.fraud_rings)} rings")

# Check for critical risk accounts
critical_accounts = [acc for acc in result.suspicious_accounts if acc.risk_level == 'CRITICAL']
print(f"  Critical risk accounts: {len(critical_accounts)}")

if critical_accounts:
    print("\nCritical Risk Accounts:")
    for acc in critical_accounts:
        print(f"  {acc.account_id}: Score {acc.suspicion_score} - {acc.patterns}")
