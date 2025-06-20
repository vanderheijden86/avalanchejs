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

function main() {
  const hexInput = process.argv[2];

  if (!hexInput) {
    console.error('Usage: npm run decode-pvm-hex-tx -- <hex-string>');
    process.exit(1);
  }

  try {
    const unsignedTxJson = hexToJson(hexInput);
    console.log('Decoded Unsigned Transaction JSON:');
    console.log(JSON.stringify(unsignedTxJson, null, 2));

    if (unsignedTxJson.vm === 'PVM') {
      console.log('\n--- Parsing P-Chain Transaction ---');
      const unsignedTx = UnsignedTx.fromJSON(JSON.stringify(unsignedTxJson));
      const tx = unsignedTx.getTx() as ImportTx;
      const baseTx = tx.baseTx.baseTx;

      console.log(`Hex: ${unsignedTxJson.txBytes.slice(2, 42)}...`);

      console.log('\nHeader:');
      console.log(`- Codec ID: ${unsignedTxJson.codecId}`);
      console.log(`- Transaction Type: 17 (ImportTx)`);
      console.log(`- Network ID: ${baseTx.NetworkId.value()}`);

      console.log('\nBase Transaction:');
      console.log(`- Blockchain ID: ${idToHex(baseTx.BlockchainId)}`);
      console.log(`- Outputs: ${baseTx.outputs.length}`);
      if (baseTx.outputs.length > 0) {
        const out = baseTx.outputs[0];
        console.log(`  - Asset ID: ${idToHex(out.assetId)}`);
        console.log(`  - Amount: ${out.output.amount()} nAVAX`);
        if ('outputOwners' in out.output) {
          const addr = out.output.outputOwners.addrs[0];
          console.log(`  - Address: ${addr.toHex()}`);
        }
      }
      console.log(`- Inputs: ${baseTx.inputs.length}`);

      console.log('\nImport Fields:');
      console.log(`- Source Chain: ${idToHex(tx.sourceChain)}`);
      console.log(`- Imported Inputs: ${tx.ins.length}`);
      if (tx.ins.length > 0) {
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

