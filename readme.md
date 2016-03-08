# h5.bluetooth.hci.inode

Bluetooth HCI Manufacturer Specific Data decoder for iNode devices in Node.js.

Extension to the [h5.bluetooth.hci](https://miracle.systems/p/h5.bluetooth.hci) package.

## Requirements

  * [Node.js](https://nodejs.org/) >= v4
  * [iNode.pl](https://inode.pl/index/s_lang/en) Bluetooth Low Energy devices

## Documentation

  * [iNode Manufacturer Specific Data](https://goo.gl/mrYk5t)

## Usage

Decoding Bluetooth HCI packets:

```js
'use strict';

const btHci = require('h5.bluetooth.hci');
const iNodeHci = require('h5.bluetooth.hci.inode');

iNodeHci.registerManufacturerSpecificDataDecoder(btHci.decoders.eirDataType);

const buffer = new Buffer(0); // the BT HCI frame buffer
const hciPacket = btHci.decode(buffer);

console.log(hciPacket);
```

Decoding iNode GSM data:

```js
'use strict';

const iNodeHci = require('h5.bluetooth.hci.inode');

const gsmTime = -1; // the `time` query parameter
const gsmData = new Buffer(0); // the request body
const reports = iNodeHci.decodeGsmData(gsmTime, gsmData); // an array of advertising reports

console.log(reports);
```

## TODO

  * Tests
  * Documentation
  * npm publish

## License

This project is released under the [MIT License](https://raw.github.com/morkai/h5.bluetooth.hci.inode/master/license.md).
