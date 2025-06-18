# Real-World EVM C to P Export Transaction Analysis

## Transaction Details

```json
{
  vm: 'EVM',
  getBlockchainId: [
    Function
    :
    getBlockchainId
  ],
  _type: 'evm.ExportTx',
  networkId: 5,
  blockchainId: yH8D7ThNJkxmtkuv2jgBa4P1Rn3Qpr4pPr7QYNfcdoS6k6HWp,
  destinationChain: 11111111111111111111111111111111LpoYY,
  ins: [
    Input
    {
      _type: 'evm.Input',
      address: avax1rgrl9wgkvl7tccf24vs5mrmfykuv7vgta3g86l,
      amount: 100000001n,
      assetId: U8iRqJoiJm8xZHAacmvYyZVwqQx6uDNtQeP3CQ6fcgQk3JqnK,
      nonce: 59n
    }
  ],
  exportedOutputs: [
    TransferableOutput
    {
      _type: 'avax.TransferableOutput',
      assetId: U8iRqJoiJm8xZHAacmvYyZVwqQx6uDNtQeP3CQ6fcgQk3JqnK,
      output: [
        TransferOutput
      ]
    }
  ]
}
```

## Key Insight: Fee Embedded in Input

- **Input**: 100,000,001 nAVAX (export amount + fee)
- **Output**: ~100,000,000 nAVAX (net export amount)
- **Fee**: 1 nAVAX difference (paid to network)

## Transaction Flow

```mermaid
sequenceDiagram
    participant User as User
    participant SDK as AvalancheJS
    participant CChain as C-Chain
    participant PChain as P-Chain
    User ->> SDK: newExportTxFromBaseFee(0.1 AVAX, baseFee, nonce: 59)
    Note right of SDK: Creates Input: 100,000,001 nAVAX<br/>(0.1 AVAX + 1 nAVAX fee)
    SDK -->> User: ExportTx with embedded fee
    User ->> CChain: Submit signed transaction
    CChain ->> CChain: Validate: balance >= 100,000,001 nAVAX
    CChain ->> CChain: Deduct 100,000,001 nAVAX from address
    CChain ->> CChain: Keep 1 nAVAX as fee
    CChain ->> PChain: Export 100,000,000 nAVAX
    PChain -->> User: ✅ 0.1 AVAX available on P-Chain
```

## Fee Architecture

Unlike P-Chain/X-Chain transactions with explicit fee fields, EVM exports embed fees within input amounts, matching
Ethereum's gas model where fees are deducted from the sender's balance.

## Fee Scenarios Analysis

### Scenario 1: Insufficient Fee (Transaction Failure)

When a user doesn't provide enough fee for the export transaction:

```mermaid
sequenceDiagram
    participant User
    participant SDK as "AvalancheJS SDK"
    participant CChain as "C-Chain"

    Note over User,CChain: Insufficient Fee Scenario

    User->>SDK: newExportTxFromBaseFee(1.0 AVAX, lowFee: 0.5 nAVAX)
    Note right of User: User wants to export 1 AVAX<br/>but provides insufficient fee

    SDK->>SDK: Calculate input amount
    Note right of SDK: Input = 1.0000005 AVAX<br/>(1.0 AVAX + 0.5 nAVAX fee)<br/>Required fee: 1.0 nAVAX

    SDK->>User: Return ExportTx (construction succeeds)
    Note left of SDK: SDK constructs transaction<br/>with provided fee amount

    User->>SDK: Sign transaction
    SDK->>CChain: Submit signed transaction

    CChain->>CChain: Validate transaction
    Note right of CChain: Check: gasLimit × gasPrice<br/>vs provided fee amount

    CChain->>CChain: Execute transaction
    Note right of CChain: Fee validation: 0.5 nAVAX < 1.0 nAVAX<br/>INSUFFICIENT FEE!

    CChain->>SDK: ❌ Transaction failed
    Note left of CChain: Error: "insufficient funds for gas * price + value"<br/>or "fee too low"

    SDK->>User: ❌ Export failed
    Note left of SDK: User keeps full balance<br/>No AVAX exported<br/>No fee charged
```

### Scenario 2: Excess Fee (Settlement Dust Handling)

When a user provides more fee than required, C-Chain handles settlement dust:

```mermaid
sequenceDiagram
    participant User
    participant SDK as "AvalancheJS SDK"
    participant CChain as "C-Chain"
    participant PChain as "P-Chain"
    participant Settlement as "Settlement Layer"

    Note over User,Settlement: Excess Fee Scenario (Settlement Dust)

    User->>SDK: newExportTxFromBaseFee(1.0 AVAX, highFee: 10 nAVAX)
    Note right of User: User wants to export 1 AVAX<br/>provides excess fee (10x required)

    SDK->>SDK: Calculate input amount
    Note right of SDK: Input = 1.00000010 AVAX<br/>(1.0 AVAX + 10 nAVAX fee)<br/>Actual gas used will determine final fee

    SDK->>User: Return ExportTx
    Note left of SDK: Transaction constructed with<br/>maximum fee allocation

    User->>SDK: Sign transaction
    SDK->>CChain: Submit signed transaction

    CChain->>CChain: Execute atomic transaction
    Note right of CChain: Calculate actual gas used:<br/>gasUsed = txBytes + signatures + atomic_base<br/>Actual fee = gasUsed × baseFee

    CChain->>CChain: Process settlement
    Note right of CChain: Deduct: 1.0 AVAX (export)<br/>Burn: 1 nAVAX (actual fee)<br/>Excess: 9 nAVAX (settlement dust)

    CChain->>Settlement: Handle settlement dust
    Note right of CChain: Dust amount below threshold<br/>gets burned/distributed according<br/>to protocol rules

    CChain->>PChain: Export actual amount
    Note right of CChain: Export: 1.0 AVAX<br/>Fee burned: 1 nAVAX<br/>Settlement handled: 9 nAVAX

    PChain->>User: ✅ 1.0 AVAX available
    Note left of PChain: User receives intended amount<br/>Excess handled by settlement layer

    Note over User,Settlement: Result: Atomic tx fee = gasUsed × baseFee<br/>Settlement dust handled by protocol
```

### Scenario 3: Exact Fee (Optimal)

When a user provides the exact required fee:

```mermaid
sequenceDiagram
    participant User
    participant SDK as "AvalancheJS SDK"
    participant CChain as "C-Chain"
    participant PChain as "P-Chain"

    Note over User,PChain: Exact Fee Scenario (Optimal)

    User->>SDK: newExportTxFromBaseFee(0.1 AVAX, exactFee: 1 nAVAX)
    Note right of User: User provides exact required fee

    SDK->>SDK: Calculate input amount
    Note right of SDK: Input = 100,000,001 nAVAX<br/>(0.1 AVAX + 1 nAVAX fee)<br/>Perfect match!

    SDK->>User: Return ExportTx
    Note left of SDK: Optimal transaction structure

    User->>SDK: Sign transaction
    SDK->>CChain: Submit signed transaction

    CChain->>CChain: Execute transaction
    Note right of CChain: Balance check: ✅<br/>Fee validation: ✅<br/>Exact fee consumed: 1 nAVAX

    CChain->>PChain: Export exact amount
    Note right of CChain: Export: 0.1 AVAX<br/>Fee: 1 nAVAX<br/>No waste, no shortage

    PChain->>User: ✅ 0.1 AVAX available
    Note left of PChain: Optimal outcome:<br/>User paid exact fee<br/>Received intended amount
```

## Fee Behavior Analysis

### Key Insights - CORRECTED

1. **Settlement Dust Mechanism**: C-Chain atomic transactions follow a gas-based model where fees are calculated as `gasUsed × baseFee`. Excess amounts beyond actual gas consumed are handled by the settlement layer as "dust."

2. **Actual Gas Charging**: Unlike my initial analysis, C-Chain atomic transactions charge only for actual gas used, not the entire input amount. The fee formula is deterministic: `1 × txBytes + 1,000 × signatures + 10,000 (base atomic cost)`.

3. **Construction vs Execution**: The SDK constructs transactions with estimated fees, but actual execution determines final gas consumption and fee.

4. **Protocol-Level Dust Handling**: Small excess amounts (settlement dust) are handled by the protocol's settlement mechanisms, not permanently lost to users.

### Corrected C-Chain Atomic Transaction Fee Model

**Official Formula** (from Avalanche docs):

```
gasUsed = 1 × len(unsignedTxBytes) + 1,000 × numSignatures + 10,000
actualFee = gasUsed × baseFee (converted to 9 decimals)
```

This means:

- **Only actual gas consumed is charged as fee**
- **Excess input amounts become settlement dust**
- **No arbitrary fee loss** beyond actual transaction cost

### Comparison with UTXO-based Fee Models

| Aspect                  | EVM Export (C-Chain)      | UTXO Import (P-Chain)                 |
| ----------------------- | ------------------------- | ------------------------------------- |
| **Excess Fee Handling** | Settlement dust mechanism | Cannot occur (exact amounts required) |
| **Fee Calculation**     | gasUsed × baseFee         | Explicit deduction from UTXO          |
| **Fee Predictability**  | Deterministic gas formula | 100% deterministic                    |
| **Settlement**          | Protocol handles dust     | No dust (exact amounts)               |
| **Fee Visibility**      | Gas-based calculation     | Explicit in transaction structure     |

### Best Practices - Updated

1. **Understand Gas Formula**: Use the deterministic gas calculation for accurate fee estimation
2. **Settlement Awareness**: Know that small excess amounts are handled by settlement, not lost
3. **Fee Estimation**: Use `estimateExportCost()` function for precise gas estimation
4. **Input Construction**: Input amount represents maximum deduction, not exact fee
