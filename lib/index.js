// Part of <https://miracle.systems/p/h5.bluetooth.hci.inode> licensed under <MIT>

'use strict';

const btHci = require('h5.bluetooth.hci');

const AdvertisingReportEventType = btHci.AdvertisingReportEventType;
const AdvertisingReportAddressType = btHci.AdvertisingReportAddressType;
const EirDataType = btHci.EirDataType;

/**
 * @enum {number}
 */
const DeviceModel = exports.DeviceModel = {
  Beacon: 0x80,
  EnergyMeter: 0x82,
  ControlId: 0x88,
  Nav: 0x89,
  CareSensor1: 0x91,
  CareSensor2: 0x92,
  CareSensor3: 0x93,
  CareSensor4: 0x94,
  CareSensor5: 0x95,
  CareSensor6: 0x96,
  CareSensorT: 0x9A,
  CareSensorHT: 0x9B,
  ControlPoint: 0xB2,
  CareRelay: 0xB3,
  TransceiverUart: 0xB5,
  TransceiverUsb: 0xB6,
  Gsm: 0xB7
};

/**
 * @param {Object<EirDataType, function(Buffer, INodeDeviceMsd)>} eirDataTypeDecoders
 */
exports.registerManufacturerSpecificDataDecoder = function(eirDataTypeDecoders)
{
  const originalDecoder = eirDataTypeDecoders[EirDataType.ManufacturerSpecificData];

  eirDataTypeDecoders[EirDataType.ManufacturerSpecificData] = function(buffer, msd)
  {
    const deviceModel = buffer[1];
    const deviceModelDecoder = exports.msdDecoders[deviceModel];

    if (deviceModelDecoder)
    {
      deviceModelDecoder(buffer, msd);
    }
    else if (originalDecoder)
    {
      originalDecoder(buffer, msd);
    }
  };
};

/**
 * @param {Buffer} buffer
 * @param {Object} [msd]
 * @returns {INodeDeviceMsd}
 * @throws {Error} If the specified buffer is not a valid iNode device MSD buffer.
 */
exports.decodeMsd = function(buffer, msd)
{
  const deviceModel = buffer[1];
  const deviceModelDecoder = exports.msdDecoders[deviceModel];

  if (!deviceModelDecoder)
  {
    throw new Error(`Cannot decode iNode MSD: '${deviceModel}' is not a valid device model!`);
  }

  if (!msd)
  {
    msd = {
      type: EirDataType.ManufacturerSpecificData,
      typeLabel: EirDataType[EirDataType.ManufacturerSpecificData],
      companyIdentifier: buffer.readUInt16LE(0)
    };
  }

  deviceModelDecoder(buffer, msd);

  return msd;
};

/**
 * @param {number} gsmTime
 * @param {Buffer} gsmData
 * @returns {Array<AdvertisingReport>}
 */
exports.decodeGsmData = function(gsmTime, gsmData)
{
  const reports = [];

  for (let i = 0; i < gsmData.length;)
  {
    const recordType = gsmData[i++];
    const recordLength = gsmData[i++];
    const recordData = gsmData.slice(i, i + recordLength);

    if (recordData.length !== recordLength)
    {
      break;
    }

    i += recordLength;

    if (recordLength < 24)
    {
      continue;
    }

    tryDecodeGsmDataRecord(gsmTime, recordType, recordData, reports);
  }

  return reports;
};

/**
 * @type {Object<DeviceModel, function(Buffer, INodeDeviceMsd)>}
 */
exports.gsmDecoders = {
  [DeviceModel.EnergyMeter]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Energy Meter';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, -1, -1, msd);
    decodeEnergyMeter(buffer.slice(0, -6), 24, msd);
  },
  [DeviceModel.CareSensor1]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #1';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
  },
  [DeviceModel.CareSensor2]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #2';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeMcp9844Temperature, null, msd);
  },
  [DeviceModel.CareSensor3]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #3';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(
      buffer,
      decodeMotionSensor,
      decodeSi7021Temperature,
      decodeSi7021Humidity,
      msd
    );
  },
  [DeviceModel.CareSensor4]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #4';

    decodeRtto(buffer, 0, msd);
    decodeGsmCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
    decodeInput(buffer, 0, msd);
  },
  [DeviceModel.CareSensor5]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #5';

    decodeRtto(buffer, 0, msd);
    decodeGsmCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, decodeMagneticField, msd);
    decodeMagneticFieldDirection(buffer, 0, msd);
  },
  [DeviceModel.CareSensor6]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor #6';

    decodeRtto(buffer, 0, msd);
    decodeGsmCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
    decodeInput(buffer, 0, msd);
    decodeOutput(buffer, 0, msd);
  },
  [DeviceModel.CareSensorT]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor T';

    decodeRtto(buffer, 0, msd);
    decodeGsmCareSensor(buffer, null, decodeMcp9844Temperature, null, msd);
  },
  [DeviceModel.CareSensorHT]: function(buffer, msd)
  {
    msd.modelLabel = 'iNode Care Sensor HT';

    decodeRtto(buffer, 0, msd);
    decodeGsmCareSensor(buffer, null, decodeSi7021Temperature, decodeSi7021Humidity, msd);
  }
};

/**
 * @type {Object<DeviceModel, function(Buffer, EirDataStructure)>}
 */
exports.msdDecoders = {
  [DeviceModel.Beacon]: function(buffer, msd)
  {
    msd.model = DeviceModel.Beacon;
    msd.modelLabel = 'iNode Beacon';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.EnergyMeter]: function(buffer, msd)
  {
    msd.model = DeviceModel.EnergyMeter;
    msd.modelLabel = 'iNode Energy Meter';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
    decodeEnergyMeter(buffer, 2, msd);
  },
  [DeviceModel.ControlId]: function(buffer, msd)
  {
    msd.model = DeviceModel.ControlId;
    msd.modelLabel = 'iNode Control ID';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.Nav]: function(buffer, msd)
  {
    msd.model = DeviceModel.Nav;
    msd.modelLabel = 'iNode Nav';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.CareSensor1]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor1;
    msd.modelLabel = 'iNode Care Sensor #1';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
  },
  [DeviceModel.CareSensor2]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor2;
    msd.modelLabel = 'iNode Care Sensor #2';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeMcp9844Temperature, null, msd);
  },
  [DeviceModel.CareSensor3]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor3;
    msd.modelLabel = 'iNode Care Sensor #3';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(
      buffer,
      decodeMotionSensor,
      decodeSi7021Temperature,
      decodeSi7021Humidity,
      msd
    );
  },
  [DeviceModel.CareSensor4]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor4;
    msd.modelLabel = 'iNode Care Sensor #4';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
    decodeInput(buffer, 0, msd);
  },
  [DeviceModel.CareSensor5]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor5;
    msd.modelLabel = 'iNode Care Sensor #5';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, decodeMagneticField, msd);
    decodeMagneticFieldDirection(buffer, 0, msd);
  },
  [DeviceModel.CareSensor6]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensor6;
    msd.modelLabel = 'iNode Care Sensor #6';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, msd);
    decodeInput(buffer, 0, msd);
    decodeOutput(buffer, 0, msd);
  },
  [DeviceModel.CareSensorT]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensorT;
    msd.modelLabel = 'iNode Care Sensor T';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, null, decodeMcp9844Temperature, null, msd);
  },
  [DeviceModel.CareSensorHT]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareSensorHT;
    msd.modelLabel = 'iNode Care Sensor HT';

    decodeRtto(buffer, 0, msd);
    decodeMsdCareSensor(buffer, null, decodeSi7021Temperature, decodeSi7021Humidity, msd);
  },
  [DeviceModel.ControlPoint]: function(buffer, msd)
  {
    msd.model = DeviceModel.ControlPoint;
    msd.modelLabel = 'iNode Control Point';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.CareRelay]: function(buffer, msd)
  {
    msd.model = DeviceModel.CareRelay;
    msd.modelLabel = 'iNode Care Relay';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
    decodeOutput(buffer, 0, msd);
  },
  [DeviceModel.TransceiverUart]: function(buffer, msd)
  {
    msd.model = DeviceModel.TransceiverUart;
    msd.modelLabel = 'iNode Transceiver UART';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.TransceiverUsb]: function(buffer, msd)
  {
    msd.model = DeviceModel.TransceiverUsb;
    msd.modelLabel = 'iNode Transceiver USB';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  },
  [DeviceModel.Gsm]: function(buffer, msd)
  {
    msd.model = DeviceModel.Gsm;
    msd.modelLabel = 'iNode GSM';

    decodeRtto(buffer, 0, msd);
    decodeAlarms(buffer, 0, -1, msd);
  }
};

/**
 * @private
 * @param {number} gsmTime
 * @param {number} recordType
 * @param {Buffer} recordData
 * @param {Array<AdvertisingReport>} reports
 */
function tryDecodeGsmDataRecord(gsmTime, recordType, recordData, reports)
{
  try
  {
    const report = decodeGsmDataRecord(gsmTime, recordType, recordData);

    if (report)
    {
      reports.push(report);
    }
  }
  catch (err) {}
}

/**
 * @private
 * @param {number} gsmTime
 * @param {number} recordType
 * @param {Buffer} recordData
 * @returns {?AdvertisingReport}
 * @throws {Error} If the specified `recordData` is invalid.
 */
function decodeGsmDataRecord(gsmTime, recordType, recordData)
{
  const deviceModel = recordData[1];
  const deviceModelDecoder = exports.gsmDecoders[deviceModel];

  if (!deviceModelDecoder)
  {
    return null;
  }

  const report = {
    eventType: AdvertisingReportEventType.AdvInd,
    eventTypeLabel: AdvertisingReportEventType[AdvertisingReportEventType.AdvInd],
    addressType: AdvertisingReportAddressType.Public,
    addressTypeLabel: AdvertisingReportAddressType[AdvertisingReportAddressType.Public],
    address: decodeGsmMacAddress(recordData),
    length: -1,
    data: [{
      type: EirDataType.LocalNameComplete,
      typeLabel: EirDataType[EirDataType.LocalNameComplete],
      value: recordData.slice(8, 24).toString().replace(/\u0000/g, '')
    }, {
      type: EirDataType.ManufacturerSpecificData,
      typeLabel: EirDataType[EirDataType.ManufacturerSpecificData],
      model: deviceModel,
      modelLabel: null
    }],
    rssi: recordData.readInt8(recordData.length - 4)
  };

  deviceModelDecoder(recordData, report.data[1]);

  return report;
}

/**
 * @private
 * @param {Buffer} buffer
 * @returns {string}
 */
function decodeGsmMacAddress(buffer)
{
  const macAddress = [];

  for (let i = 7; i >= 2; --i)
  {
    macAddress.push((buffer[i] < 0x10 ? '0' : '') + buffer[i].toString(16).toUpperCase());
  }

  return macAddress.join(':');
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodePosition
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodeValue1
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodeValue2
 * @param {INodeCareSensorMsd} msd
 */
function decodeGsmCareSensor(buffer, decodePosition, decodeValue1, decodeValue2, msd)
{
  decodeAlarms(buffer, 0, 24, msd);

  msd.groups = 0;
  msd.batteryLevel = 100;
  msd.batteryVoltage = 2.88;

  if (decodePosition)
  {
    decodePosition(buffer, 26, msd);
  }

  if (decodeValue1)
  {
    decodeValue1(buffer, 28, msd);
  }

  if (decodeValue2)
  {
    decodeValue2(buffer, 30, msd);
  }

  msd.time = new Date();
  msd.signature = new Buffer(8).fill(0);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodePosition
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodeValue1
 * @param {?function(Buffer, number, INodeCareSensorMsd): void} decodeValue2
 * @param {INodeCareSensorMsd} msd
 */
function decodeMsdCareSensor(buffer, decodePosition, decodeValue1, decodeValue2, msd)
{
  decodeAlarms(buffer, 0, 4, msd);
  decodeGroups(buffer, 2, msd);
  decodeBatteryLevel(buffer, 2, 12, msd);

  if (decodePosition)
  {
    decodePosition(buffer, 6, msd);
  }

  if (decodeValue1)
  {
    decodeValue1(buffer, 8, msd);
  }

  if (decodeValue2)
  {
    decodeValue2(buffer, 10, msd);
  }

  decodeTime(buffer, 12, msd);
  decodeSignature(buffer, 16, msd);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeInput(buffer, i, msd)
{
  msd.input = !!(buffer[i] & 0x08);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {(INodeCareSensorMsd|INodeCareRelayMsd)} msd
 */
function decodeOutput(buffer, i, msd)
{
  msd.output = !!(buffer[i] & 0x01);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeDeviceMsd} msd
 */
function decodeRtto(buffer, i, msd)
{
  msd.rtto = !!(buffer[i] & 0x02);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeMagneticFieldDirection(buffer, i, msd)
{
  msd.magneticFieldDirection = !!(buffer[i] & 0x08);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} batteryI
 * @param {number} extendedI
 * @param {INodeDeviceMsd} msd
 */
function decodeAlarms(buffer, batteryI, extendedI, msd)
{
  const battery = ((batteryI === -1 ? 0 : buffer[batteryI]) << 13) & 0x8000;
  const extended = extendedI === -1 ? 0 : buffer.readUInt16LE(extendedI);
  const alarms = extended | battery;

  msd.alarms = {
    lowBattery: !!(alarms & 0x8000)
  };

  if (extendedI !== -1)
  {
    Object.assign(msd.alarms, {
      moveAccelerometer: !!(alarms & 0x01),
      levelAccelerometer: !!(alarms & 0x02),
      levelTemperature: !!(alarms & 0x04),
      levelHumidity: !!(alarms & 0x08),
      contactChange: !!(alarms & 0x10),
      moveStopped: !!(alarms & 0x20),
      moveGTimer: !!(alarms & 0x40),
      levelAccelerometerChange: !!(alarms & 0x80),
      levelMagnetChange: !!(alarms & 0x100),
      levelMagnetTimer: !!(alarms & 0x200)
    });
  }
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeGroups(buffer, i, msd)
{
  msd.groups = buffer.readUInt16LE(i) & 0x0FFF;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {number} shift
 * @param {(INodeCareSensorMsd|INodeEnergyMeterMsd)} msd
 */
function decodeBatteryLevel(buffer, i, shift, msd)
{
  const value = (buffer.readUInt16LE(i) >> shift) & 0x0F;

  if (value === 1)
  {
    msd.batteryLevel = 100;
  }
  else
  {
    msd.batteryLevel = 10 * (Math.min(value, 11) - 1);
  }

  msd.batteryVoltage = (msd.batteryLevel - 10) * 1.2 / 100 + 1.8;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeEnergyMeterMsd} msd
 */
function decodeEnergyMeter(buffer, i, msd)
{
  const options = buffer.readUInt16LE(i + 6);
  const unit = (options >> 14) & 3;
  let constant = options & 0x3FFF;

  if (unit === 0)
  {
    msd.averageUnit = 'kWh';
    msd.sumUnit = 'kW';

    if (constant === 0)
    {
      constant = 1000;
    }
  }
  else if (unit === 1)
  {
    msd.averageUnit = 'm³';
    msd.sumUnit = 'm³';

    if (constant === 0)
    {
      constant = 1000;
    }
  }
  else
  {
    msd.averageUnit = 'cnt';
    msd.sumUnit = 'cnt';

    if (constant === 0)
    {
      constant = 1;
    }
  }

  msd.unit = unit;
  msd.constant = constant;
  msd.average = Math.round(60 * buffer.readUInt16LE(i) / constant * 1000) / 1000;
  msd.sum = Math.round(buffer.readUInt32LE(i + 2) / constant * 1000) / 1000;

  const extraDataLength = i
    + 2 // Average
    + 4 // Sum
    + 2 // Options
    + 1 // Battery & Light
    + 2; // Previous day

  if (buffer.length >= extraDataLength)
  {
    decodeBatteryLevel(buffer, i + 8, 4, msd);

    msd.lightLevel = Math.round((buffer[i + 8] & 0x0F) * 100 / 15 * 10) / 10;

    const weekDataData = buffer.readUInt16LE(i + 9);

    msd.weekDay = weekDataData >> 13;
    msd.weekDayTotal = weekDataData & 0x1FFF;
  }
  else
  {
    msd.batteryLevel = 100;
    msd.batteryVoltage = 2.88;
    msd.lightLevel = 0;
    msd.weekDay = new Date(Date.now() - 24 * 3600 * 1000).getDay();
    msd.weekDayTotal = 0;
  }
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeMotionSensor(buffer, i, msd)
{
  const value = buffer.readUInt16LE(i);
  const x = (value >> 10) & 0x1F;
  const y = (value >> 5) & 0x1F;
  const z = value & 0x1F;

  msd.position = {
    motion: !!(value & 0x8000),
    x: x - (x & 0x10 ? 0x1F : 0),
    y: y - (y & 0x10 ? 0x1F : 0),
    z: z - (z & 0x10 ? 0x1F : 0)
  };
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeCsrTemperature(buffer, i, msd)
{
  let value = buffer.readUInt16LE(i);

  if (value > 127)
  {
    value -= 8192;
  }

  if (value < -30)
  {
    value = -30;
  }
  else if (value > 70)
  {
    value = 70;
  }

  msd.temperature = value;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeMcp9844Temperature(buffer, i, msd)
{
  const b1 = buffer[i];
  const b2 = buffer[i + 1];
  let value = b1 * 0.0625 + 16 * (b2 & 0x0F);

  if (b2 & 0x10)
  {
    value -= 256;
  }

  if (value < -30)
  {
    value = -30;
  }
  else if (value > 70)
  {
    value = 70;
  }

  msd.temperature = Math.round(value * 100) / 100;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeSi7021Temperature(buffer, i, msd)
{
  let value = buffer.readUInt16LE(i) * 175.72 * 4;
  value /= 65536;
  value -= 46.85;

  if (value < -30)
  {
    value = -30;
  }
  else if (value > 70)
  {
    value = 70;
  }

  msd.temperature = Math.round(value * 100) / 100;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeSi7021Humidity(buffer, i, msd)
{
  let value = buffer.readUInt16LE(i) * 125 * 4;
  value /= 65536;
  value -= 6;

  if (value < 1)
  {
    value = 1;
  }
  else if (value > 100)
  {
    value = 100;
  }

  msd.humidity = Math.round(value * 100) / 100;
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeMagneticField(buffer, i, msd)
{
  msd.magneticField = buffer.readUInt16LE(i);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeTime(buffer, i, msd)
{
  const value1 = buffer.readUInt16LE(i) << 16;
  const value2 = buffer.readUInt16LE(i + 2);
  const value = value1 | value2;

  msd.time = new Date(value * 1000);
}

/**
 * @private
 * @param {Buffer} buffer
 * @param {number} i
 * @param {INodeCareSensorMsd} msd
 */
function decodeSignature(buffer, i, msd)
{
  msd.signature = buffer.slice(i, i + 8);
}

/**
 * @typedef {Object} INodeDeviceMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 */

/**
 * @typedef {Object} INodeEnergyMeterMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 * @property {string} averageUnit
 * @property {string} sumUnit
 * @property {number} unit
 * @property {number} constant
 * @property {number} average
 * @property {number} sum
 * @property {number} batteryLevel
 * @property {number} batteryVoltage
 * @property {number} lightLevel
 * @property {number} weekDay
 * @property {number} weekDayTotal
 */

/**
 * @typedef {Object} INodeCareSensorMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 * @property {boolean} alarms.moveAccelerometer
 * @property {boolean} alarms.levelAccelerometer
 * @property {boolean} alarms.levelTemperature
 * @property {boolean} alarms.levelHumidity
 * @property {boolean} alarms.contactChange
 * @property {boolean} alarms.moveStopped
 * @property {boolean} alarms.moveGTimer
 * @property {boolean} alarms.levelAccelerometerChange
 * @property {boolean} alarms.levelMagnetChange
 * @property {boolean} alarms.levelMagnetTimer
 * @property {Date} time
 * @property {number} groups
 * @property {number} batteryLevel
 * @property {number} batteryVoltage
 * @property {Buffer} signature
 * @property {boolean} [input]
 * @property {boolean} [output]
 * @property {Object} [position]
 * @property {boolean} position.motion
 * @property {number} position.x
 * @property {number} position.y
 * @property {number} position.z
 * @property {number} [temperature]
 * @property {number} [humidity]
 * @property {boolean} [magneticFieldDirection]
 * @property {number} [magneticField]
 */

/**
 * @typedef {Object} INodeCareRelayMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 * @property {boolean} output
 */
