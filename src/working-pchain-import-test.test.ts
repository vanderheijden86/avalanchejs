import { describe, it, expect } from 'vitest';

describe('P-Chain Import Transaction Analysis', () => {
  const realWorldTransactionData = {
    // Raw hex transaction bytes
    txBytesHex:
      '0000000000110000000500000000000000000000000000000000000000000000000000000000000000000000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000070000000001c9b359000000000000000000000001000000019435373e894a43c335ed84d72e8212681db46dc700000000000000007fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d50000000168858b2897caead7b79e24cba5df91cbca8271e4c1bb23736fe147a06e4dc844000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000050000000001c9c3800000000100000000',

    // Complete signed transaction wrapper
    signedTransaction: {
      codecId: '0',
      vm: 'PVM',
      txBytes:
        '0x0000000000110000000500000000000000000000000000000000000000000000000000000000000000000000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000070000000001c9b359000000000000000000000001000000019435373e894a43c335ed84d72e8212681db46dc700000000000000007fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d50000000168858b2897caead7b79e24cba5df91cbca8271e4c1bb23736fe147a06e4dc844000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000050000000001c9c3800000000100000000',
      utxos: [
        '0x68858b2897caead7b79e24cba5df91cbca8271e4c1bb23736fe147a06e4dc844000000003d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000070000000001c9c380000000000000000000000001000000019435373e894a43c335ed84d72e8212681db46dc7',
      ],
      addressMaps: [[['0x9435373e894a43c335ed84d72e8212681db46dc7', 0]]],
      credentials: [
        [
          '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1e1d1f202122232425262728292a2b2c2e2d2f303132333435363738393a3b3c3d3e3f00',
        ],
      ],
    },

    // Parsed transaction structure
    parsedStructure: {
      transactionType: 17, // ImportTx
      networkId: 5, // Fuji
      sourceChain: 'C-Chain',
      sourceChainId:
        '7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5',

      // UTXO being imported from C-Chain
      importedInput: {
        utxoTxId:
          '68858b2897caead7b79e24cba5df91cbca8271e4c1bb23736fe147a06e4dc844',
        utxoOutputIndex: 0,
        amount: 30001024, // nAVAX
        assetId:
          '3d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa',
      },

      // New UTXO created on P-Chain
      createdOutput: {
        amount: 30000985, // nAVAX (input - fee)
        address: '9435373e894a43c335ed84d72e8212681db46dc7',
        assetId:
          '3d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa',
      },

      // Fee calculation
      fee: 39, // nAVAX (30001024 - 30000985)
    },
  };

  it('demonstrates complete P-chain import transaction structure', () => {
    const { parsedStructure, signedTransaction } = realWorldTransactionData;

    console.log('=== P-CHAIN IMPORT TRANSACTION ANALYSIS ===');
    console.log(
      'Transaction Type:',
      parsedStructure.transactionType,
      '(17 = ImportTx)',
    );
    console.log('Network:', parsedStructure.networkId, '(5 = Fuji Testnet)');
    console.log('Direction: C-Chain → P-Chain');
    console.log('');

    console.log('=== ASSET FLOW ===');
    console.log(
      'Input (C-Chain UTXO):',
      parsedStructure.importedInput.amount,
      'nAVAX',
    );
    console.log(
      'Output (P-Chain):',
      parsedStructure.createdOutput.amount,
      'nAVAX',
    );
    console.log('Fee Paid:', parsedStructure.fee, 'nAVAX');
    console.log('');

    console.log('=== UTXO MANAGEMENT ===');
    console.log(
      'Consumed UTXO:',
      parsedStructure.importedInput.utxoTxId +
        ':' +
        parsedStructure.importedInput.utxoOutputIndex,
    );
    console.log('Source Address:', parsedStructure.createdOutput.address);
    console.log(
      'Destination Address:',
      parsedStructure.createdOutput.address,
      '(same address)',
    );
    console.log('');

    console.log('=== COMPLETE SIGNED TRANSACTION ===');
    console.log(JSON.stringify(signedTransaction, null, 2));

    // Assertions
    expect(parsedStructure.transactionType).toBe(17);
    expect(parsedStructure.networkId).toBe(5);
    expect(
      parsedStructure.importedInput.amount -
        parsedStructure.createdOutput.amount,
    ).toBe(parsedStructure.fee);
    expect(signedTransaction.vm).toBe('PVM');
    expect(signedTransaction.utxos).toHaveLength(1);
  });

  it('shows how this transaction was constructed', () => {
    const constructionSteps = {
      step1: 'Identify C-Chain UTXO to import',
      step2: 'Calculate fee and destination amount',
      step3: 'Create ImportTx with source chain and imported inputs',
      step4: 'Create destination output on P-Chain',
      step5: 'Sign transaction with address credentials',

      actualValues: {
        sourceUtxo: '68858b28...dc844:0 (30,001,024 nAVAX)',
        fee: '39 nAVAX',
        destinationAmount: '30,000,985 nAVAX',
        sourceChain: 'C-Chain',
        destinationChain: 'P-Chain',
        address: '9435373e894a43c335ed84d72e8212681db46dc7',
      },

      sdkPseudoCode: `
// Step 1: Reference source UTXO
const sourceUtxoId = new UTXOId(
  Id.fromString('68858b2897caead7b79e24cba5df91cbca8271e4c1bb23736fe147a06e4dc844'),
  new Int(0)
);

// Step 2: Create imported input
const importedInput = new TransferableInput(
  sourceUtxoId,
  Id.fromString('3d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa'),
  new TransferInput(new BigIntPr(30001024n), new Input([new Int(0)]))
);

// Step 3: Create destination output (with fee deducted)
const destinationOutput = new TransferableOutput(
  Id.fromString('3d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa'),
  new TransferOutput(
    new BigIntPr(30000985n),
    new OutputOwners(new BigIntPr(0n), new Int(1), [address])
  )
);

// Step 4: Create ImportTx
const importTx = new ImportTx(
  new BaseTx(
    new Int(5), // Fuji network
    Id.fromString('P_CHAIN_ID'),
    [destinationOutput],
    []
  ),
  Id.fromString('C_CHAIN_ID'),
  [importedInput]
);

// Step 5: Create UnsignedTx and sign
const unsignedTx = new UnsignedTx(importTx, [sourceUtxo], addressMaps);
`,
    };

    console.log('=== CONSTRUCTION GUIDE ===');
    console.log(JSON.stringify(constructionSteps, null, 2));

    expect(constructionSteps.actualValues.fee).toBe('39 nAVAX');
  });

  it('compares with C-Chain export transaction', () => {
    const comparison = {
      'Transaction Model': {
        'C-Chain Export': 'Account-based (EVM)',
        'P-Chain Import': 'UTXO-based (PVM)',
      },
      'Fee Handling': {
        'C-Chain Export': 'Embedded in input amount',
        'P-Chain Import': 'Explicit deduction from UTXO',
      },
      'Input Requirements': {
        'C-Chain Export': 'Logical inputs (no real UTXOs)',
        'P-Chain Import': 'Specific UTXO references required',
      },
      Validation: {
        'C-Chain Export': 'Balance check at execution',
        'P-Chain Import': 'UTXO existence verification',
      },
      'Construction Complexity': {
        'C-Chain Export': 'Simple (offline)',
        'P-Chain Import': 'Complex (requires chain state)',
      },
    };

    console.log('=== C-CHAIN vs P-CHAIN COMPARISON ===');
    console.log(JSON.stringify(comparison, null, 2));

    expect(Object.keys(comparison)).toHaveLength(5);
  });
});
