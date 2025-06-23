#!/usr/bin/env node

import { UnsignedTx } from '../src/vms/common/unsignedTx';
import type { ImportTx } from '../src/serializable/pvm/importTx';
import { bufferToHex } from '../src/utils/buffer';

// Convert a hex encoded JSON string back into a JavaScript object
function hexToJson(hexString: string): any {
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  const jsonString = Buffer.from(cleanHex, 'hex').toString();
  return JSON.parse(jsonString);
}

function idToHex(id: { toBytes: () => Uint8Array }): string {
  return bufferToHex(id.toBytes());
}

function formatAmount(amount: bigint): string {
  return (Number(amount) / 1e9).toFixed(6);
}

function formatAddress(address: string): string {
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

function printTable(headers: string[], rows: string[][]) {
  const colWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => row[i]?.length || 0)),
  );

  // Print header
  const headerRow = headers
    .map((header, i) => header.padEnd(colWidths[i]))
    .join(' | ');
  console.log(headerRow);
  console.log(colWidths.map((width) => '-'.repeat(width)).join('-+-'));

  // Print rows
  rows.forEach((row) => {
    const formattedRow = row
      .map((cell, i) => (cell || '').padEnd(colWidths[i]))
      .join(' | ');
    console.log(formattedRow);
  });
}

async function main() {
  const hexInput = process.argv[2];

  if (!hexInput) {
    console.error('Usage: npm run decode-pvm-hex-tx -- <hex-string>');
    process.exit(1);
  }

  try {
    console.log('Step 1: Decoding hex to JSON...');
    const unsignedTxJson = hexToJson(hexInput);
    console.log('Decoded Unsigned Transaction JSON:');
    console.log(JSON.stringify(unsignedTxJson, null, 2));

    if (unsignedTxJson.vm === 'PVM') {
      console.log('\n--- Parsing P-Chain Transaction ---');

      console.log('Step 2: Creating UnsignedTx from JSON...');
      const unsignedTx = UnsignedTx.fromJSON(JSON.stringify(unsignedTxJson));

      console.log('Step 3: Getting transaction...');
      const tx = unsignedTx.getTx() as ImportTx;

      console.log('Step 4: Getting baseTx...');
      const baseTx = tx.baseTx;

      console.log(`Hex: ${unsignedTxJson.txBytes.slice(2, 42)}...`);

      console.log('\nHeader:');
      console.log(`- Codec ID: ${unsignedTxJson.codecId}`);
      console.log(`- Transaction Type: 17 (ImportTx)`);

      console.log('Step 5: Getting Network ID...');
      console.log(`- Network ID: ${baseTx.NetworkId.value()}`);

      console.log('\nBase Transaction:');
      console.log('Step 6: Getting Blockchain ID...');
      console.log(`- Blockchain ID: ${idToHex(baseTx.BlockchainId)}`);
      console.log(`- Outputs: ${baseTx.outputs.length}`);

      if (baseTx.outputs.length > 0) {
        console.log('Step 7: Processing outputs...');
        const out = baseTx.outputs[0];
        console.log(`  - Asset ID: ${idToHex(out.assetId)}`);
        console.log(`  - Amount: ${out.output.amount()} nAVAX`);
        if ('outputOwners' in out.output && out.output.outputOwners) {
          const outputOwners = out.output.outputOwners as any;
          if (outputOwners.addrs && outputOwners.addrs.length > 0) {
            const addr = outputOwners.addrs[0];
            console.log(`  - Address: ${addr.toHex()}`);
          }
        }
      }
      console.log(`- Inputs: ${baseTx.inputs.length}`);

      console.log('\nImport Fields:');
      console.log('Step 8: Getting source chain...');
      console.log(`- Source Chain: ${idToHex(tx.sourceChain)}`);
      console.log(`- Imported Inputs: ${tx.ins.length}`);

      if (tx.ins.length > 0) {
        console.log('Step 9: Processing imported inputs...');
        const inp = tx.ins[0];
        console.log(
          `  - UTXO ID: ${idToHex(
            inp.utxoID.txID,
          )}:${inp.utxoID.outputIdx.value()}`,
        );
        console.log(`  - Asset ID: ${idToHex(inp.assetId)}`);
        console.log(`  - Amount: ${inp.amount()} nAVAX`);
        console.log(`  - Signature Indices: [${inp.sigIndicies().join(', ')}]`);
      }

      // Calculate totals and display table
      console.log('\n' + '='.repeat(80));
      console.log('TRANSACTION SUMMARY');
      console.log('='.repeat(80));

      // Transaction Details Table
      console.log('\n📋 Transaction Details:');
      const detailsHeaders = ['Property', 'Value'];
      const detailsRows = [
        ['Transaction Type', 'ImportTx (17)'],
        ['Network ID', baseTx.NetworkId.value().toString()],
        ['Blockchain ID', formatAddress(idToHex(baseTx.BlockchainId))],
        ['Source Chain', formatAddress(idToHex(tx.sourceChain))],
        ['Codec ID', unsignedTxJson.codecId],
      ];
      printTable(detailsHeaders, detailsRows);

      // Inputs Table
      console.log('\n💰 Imported Inputs:');
      const inputHeaders = [
        'UTXO ID',
        'Asset ID',
        'Amount (AVAX)',
        'Sig Indices',
      ];
      const inputRows: string[][] = [];
      let totalInputs = 0n;

      tx.ins.forEach((inp) => {
        const utxoId = `${idToHex(inp.utxoID.txID).slice(0, 10)}...${idToHex(
          inp.utxoID.txID,
        ).slice(-8)}:${inp.utxoID.outputIdx.value()}`;
        const assetId = formatAddress(idToHex(inp.assetId));
        const amount = formatAmount(inp.amount());
        const sigIndices = `[${inp.sigIndicies().join(', ')}]`;

        inputRows.push([utxoId, assetId, amount, sigIndices]);
        totalInputs += inp.amount();
      });

      printTable(inputHeaders, inputRows);

      // Outputs Table
      console.log('\n💸 Outputs:');
      const outputHeaders = ['Asset ID', 'Amount (AVAX)', 'Recipient Address'];
      const outputRows: string[][] = [];
      let totalOutputs = 0n;

      baseTx.outputs.forEach((out) => {
        const assetId = formatAddress(idToHex(out.assetId));
        const amount = formatAmount(out.output.amount());
        let address = 'N/A';

        if ('outputOwners' in out.output && out.output.outputOwners) {
          const outputOwners = out.output.outputOwners as any;
          if (outputOwners.addrs && outputOwners.addrs.length > 0) {
            const addr = outputOwners.addrs[0];
            address = formatAddress(addr.toHex());
          }
        }

        outputRows.push([assetId, amount, address]);
        totalOutputs += out.output.amount();
      });

      printTable(outputHeaders, outputRows);

      // Fee Calculation
      const fee = totalInputs - totalOutputs;
      console.log('\n💳 Fee Calculation:');
      const feeHeaders = ['Description', 'Amount (AVAX)', 'Amount (nAVAX)'];
      const feeRows = [
        ['Total Inputs', formatAmount(totalInputs), totalInputs.toString()],
        ['Total Outputs', formatAmount(totalOutputs), totalOutputs.toString()],
        ['Fee Paid', formatAmount(fee), fee.toString()],
        [
          'Fee Rate',
          `${((Number(fee) / Number(totalInputs)) * 100).toFixed(4)}%`,
          '',
        ],
      ];
      printTable(feeHeaders, feeRows);

      console.log('\n' + '='.repeat(80));
    } else {
      console.log(
        `\n⚠️  VM type '${unsignedTxJson.vm}' is not supported for detailed parsing`,
      );
    }
  } catch (error: any) {
    console.error('Error occurred:', error.message || error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Main function error:', error);
  process.exit(1);
});
