#!/usr/bin/env node

import { EVMUnsignedTx } from '../src/vms/common/evmUnsignedTx';
import type { ExportTx } from '../src/serializable/evm/exportTx';

// Helper function to decode hex-encoded JSON (copied from test file)
function hexToJson(hexString: string): any {
  // Remove '0x' prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  // Convert hex to bytes
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }

  // Convert bytes to string and parse as JSON
  const jsonString = new TextDecoder().decode(bytes);
  return JSON.parse(jsonString);
}

function main() {
  const hexInput = process.argv[2];

  if (!hexInput) {
    console.error('Usage: npm run decode-hex-tx -- <hex-string>');
    console.error('Example: npm run decode-hex-tx -- 0x7b22636f6465...');
    process.exit(1);
  }

  try {
    // Decode hex to JSON
    const unsignedTxJson = hexToJson(hexInput);
    console.log('Decoded Unsigned Transaction JSON:');
    console.log(JSON.stringify(unsignedTxJson, null, 2));

    // If it's an EVM transaction, parse it further
    if (unsignedTxJson.vm === 'EVM') {
      console.log('\n--- Parsing EVM Transaction ---');
      const unsignedTx = EVMUnsignedTx.fromJSON(JSON.stringify(unsignedTxJson));
      const exportTx = unsignedTx.getTx() as ExportTx;

      console.log('Real-world ExportTx:', exportTx);
      console.log('Inputs length:', exportTx.ins.length);
      console.log('Exported outputs length:', exportTx.exportedOutputs.length);

      // Show detailed input information
      if (exportTx.ins.length > 0) {
        console.log('\nInput Details:');
        exportTx.ins.forEach((input, i) => {
          console.log(`  Input ${i}:`);
          console.log(`    _type: ${input._type}`);
          console.log(`    address: ${input.address.toString()}`);
          console.log(`    amount: ${input.amount.toString()}`);
          console.log(`    assetId: ${input.assetId.toString()}`);
          console.log(`    nonce: ${input.nonce?.toString()}`);
        });
      }

      // Show detailed output information
      if (exportTx.exportedOutputs.length > 0) {
        console.log('\nExported Output Details:');
        exportTx.exportedOutputs.forEach((output, i) => {
          console.log(`  Output ${i}:`);
          console.log(`    _type: ${output._type}`);
          console.log(`    assetId: ${output.assetId.toString()}`);
          console.log(`    output: [${output.output.constructor.name}]`);
        });
      }

      // Show transaction metadata
      console.log('\nTransaction Metadata:');
      console.log(`  Network ID: ${Number(exportTx.networkId.value())}`);
      console.log(`  Blockchain ID: ${exportTx.blockchainId.toString()}`);
      console.log(
        `  Destination Chain: ${exportTx.destinationChain.toString()}`,
      );
    } else {
      console.log(
        `\n⚠️  VM type '${unsignedTxJson.vm}' is not supported for detailed parsing`,
      );
    }
  } catch (error: any) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
