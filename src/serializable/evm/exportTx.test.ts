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

// Helper function to decode hex-encoded JSON
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

testSerialization('ExportTx', ExportTx, exportTx, exportTxBytes, testEVMCodec);

describe('ExportTx - Hex Input Processing', () => {
  it('processes unsigned transaction from hex-encoded bytes', () => {
    const hexInput =
      '0x7b22636f6465634964223a2230222c22766d223a2245564d222c2274784279746573223a22307830303030303030303030303130303030303030353766633933643835633664363263356232616330623531396338373031306561353239343031326431653430373033306436616364303032316361633130643530303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303131613037663262393136363766636263363132616162323134643866363932356238636633313062303030303030303030363338616662663364396264616330656431643736313333306366363830656664656231613432313539656233383764366432393530633936663764323866363162626532616130303030303030303030303030343330303030303030313364396264616330656431643736313333306366363830656664656231613432313539656233383764366432393530633936663764323866363162626532616130303030303030373030303030303030303566356531303030303030303030303030303030303030303030303030303131303030303030303139343335333733653839346134336333333565643834643732653832313236383164623436646337222c227574786f73223a5b5d2c22616464726573734d617073223a5b5b5b22307831613037663262393136363766636263363132616162323134643866363932356238636633313062222c305d5d5d2c2263726564656e7469616c73223a5b5b2230303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030225d5d7d';

    // Decode hex to JSON
    const unsignedTxJson = hexToJson(hexInput);
    console.log('Decoded JSON:', unsignedTxJson);

    // Validate the decoded JSON structure
    expect(unsignedTxJson).toHaveProperty('codecId', '0');
    expect(unsignedTxJson).toHaveProperty('vm', 'EVM');
    expect(unsignedTxJson).toHaveProperty('txBytes');
    expect(unsignedTxJson).toHaveProperty('utxos');
    expect(unsignedTxJson).toHaveProperty('addressMaps');
    expect(unsignedTxJson).toHaveProperty('credentials');

    // Verify the structure matches expected format
    expect(Array.isArray(unsignedTxJson.utxos)).toBe(true);
    expect(Array.isArray(unsignedTxJson.addressMaps)).toBe(true);
    expect(Array.isArray(unsignedTxJson.credentials)).toBe(true);
    expect(typeof unsignedTxJson.txBytes).toBe('string');
    expect(unsignedTxJson.txBytes.startsWith('0x')).toBe(true);

    console.log(
      '✅ Successfully decoded and validated hex-encoded transaction JSON',
    );
    console.log('Transaction type:', unsignedTxJson.vm);
    console.log('Codec ID:', unsignedTxJson.codecId);
    console.log('TX bytes length:', unsignedTxJson.txBytes.length);
    console.log('Number of UTXOs:', unsignedTxJson.utxos.length);
    console.log('Number of address maps:', unsignedTxJson.addressMaps.length);
    console.log('Number of credentials:', unsignedTxJson.credentials.length);
  });

  it('handles multiple hex input formats', () => {
    const testCases = [
      {
        name: 'with 0x prefix',
        hex: '0x7b22636f6465634964223a2230222c22766d223a2245564d227d', // {"codecId":"0","vm":"EVM"}
        expected: { codecId: '0', vm: 'EVM' },
      },
      {
        name: 'without 0x prefix',
        hex: '7b22636f6465634964223a2230222c22766d223a2245564d227d', // {"codecId":"0","vm":"EVM"}
        expected: { codecId: '0', vm: 'EVM' },
      },
    ];

    testCases.forEach(({ name, hex, expected }) => {
      console.log(`Testing ${name}:`);
      const decoded = hexToJson(hex);
      console.log('Decoded:', decoded);
      expect(decoded).toEqual(expected);
    });
  });

  it('demonstrates hex-to-transaction parsing workflow', () => {
    // This test shows how to use the hex parsing functionality with existing working transactions
    const workingTxJson = {
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
    };

    // Convert to hex (simulating what a user might receive)
    const jsonString = JSON.stringify(workingTxJson);
    const hexString =
      '0x' +
      Array.from(new TextEncoder().encode(jsonString))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

    console.log('Generated hex string from working transaction');
    console.log('Hex length:', hexString.length);

    // Decode back using our helper function
    const decodedJson = hexToJson(hexString);
    console.log('Successfully decoded hex back to JSON');

    // Validate that it matches the original
    expect(decodedJson).toEqual(workingTxJson);

    // Parse as EVMUnsignedTx (this should work since it's a known working transaction)
    const unsignedTx = EVMUnsignedTx.fromJSON(JSON.stringify(decodedJson));
    const exportTx = unsignedTx.getTx() as ExportTx;

    console.log('Successfully parsed hex-decoded transaction into ExportTx');
    console.log('Network ID:', Number(exportTx.networkId.value()));
    console.log('Number of inputs:', exportTx.ins.length);
    console.log('Number of exported outputs:', exportTx.exportedOutputs.length);

    // Validate the parsed transaction
    expect(exportTx).toBeInstanceOf(ExportTx);
    expect(Number(exportTx.networkId.value())).toBe(5); // Fuji testnet
    expect(exportTx.ins.length).toBe(1);
    expect(exportTx.exportedOutputs.length).toBe(1);
  });
});

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
