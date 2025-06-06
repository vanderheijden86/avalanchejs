import { describe, it, expect } from 'vitest';
import { testEVMCodec } from '../../fixtures/codec';
import {
  exportTx,
  exportTxBytes,
  specificExportTxBytes,
} from '../../fixtures/evm';
import { testSerialization } from '../../fixtures/utils/serializable';
import { ExportTx } from './exportTx';
import { EVMUnsignedTx } from '../../vms/common/evmUnsignedTx';

testSerialization('ExportTx', ExportTx, exportTx, exportTxBytes, testEVMCodec);

describe('ExportTx - Specific Transaction', () => {
  it('deserializes correctly from provided bytes', () => {
    const bytes = specificExportTxBytes();
    console.log('Total bytes length:', bytes.length);
    console.log(
      'First 100 bytes:',
      Array.from(bytes.slice(0, 100))
        .map((b) => '0x' + b.toString(16).padStart(2, '0'))
        .join(' '),
    );

    const [output, remainder] = ExportTx.fromBytes(bytes, testEVMCodec());
    console.log('Deserialized ExportTx:', output);
    console.log('Remainder length:', remainder.length);
    console.log(
      'First 50 remainder bytes:',
      Array.from(remainder.slice(0, 50))
        .map((b) => '0x' + b.toString(16).padStart(2, '0'))
        .join(' '),
    );

    expect(output).toBeInstanceOf(ExportTx);
    expect(Number(output.networkId.value())).toBe(0);
    expect(output.blockchainId).toBeDefined();
    expect(output.destinationChain).toBeDefined();
    expect(Array.isArray(output.ins)).toBe(true);
    expect(Array.isArray(output.exportedOutputs)).toBe(true);
    // Remaining bytes are expected since the original data contains additional transaction wrapper data
    expect(remainder.length).toBeGreaterThan(0);
  });

  it('serializes correctly', () => {
    const [tx] = ExportTx.fromBytes(specificExportTxBytes(), testEVMCodec());
    const serialized = tx.toBytes(testEVMCodec());
    const [deserialized] = ExportTx.fromBytes(serialized, testEVMCodec());
    expect(JSON.stringify(deserialized)).toBe(JSON.stringify(tx));
  });
});

it('deserializes real-world signed transaction correctly', () => {
  // This is the complete signed transaction JSON from the user
  const signedTxJson = JSON.stringify({
    codecId: '0',
    vm: 'EVM',
    txBytes:
      '0x000000000001000000057fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d50000000000000000000000000000000000000000000000000000000000000000000000011a07f2b91667fcbc612aab214d8f6925b8cf310b0000000005f5e1013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000000000003b000000013d9bdac0ed1d761330cf680efdeb1a42159eb387d6d2950c96f7d28f61bbe2aa000000070000000005f5e100000000000000000000000001000000019435373e894a43c335ed84d72e8212681db46dc7',
    utxos: [],
    addressMaps: [[['0x1a07f2b91667fcbc612aab214d8f6925b8cf310b', 0]]],
    credentials: [
      [
        '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1e1d1f202122232425262728292a2b2c2e2d2f303132333435363738393a3b3c3d3e3f00',
      ],
    ],
  });

  const unsignedTx = EVMUnsignedTx.fromJSON(signedTxJson);
  const exportTx = unsignedTx.getTx() as ExportTx;

  console.log('Real-world ExportTx:', exportTx);
  console.log('Inputs length:', exportTx.ins.length);
  console.log('Exported outputs length:', exportTx.exportedOutputs.length);

  expect(exportTx).toBeInstanceOf(ExportTx);
  expect(exportTx.ins.length).toBeGreaterThan(0);
  expect(exportTx.exportedOutputs.length).toBeGreaterThan(0);
});
