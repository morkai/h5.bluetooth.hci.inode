// Part of <https://miracle.systems/p/h5.bluetooth.hci.inode> licensed under <MIT>

'use strict';

const EirDataType = require('h5.bluetooth.hci').EirDataType;

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
 * @param {Object<EirDataType, function(Buffer, EirDataStructure)>} eirDataTypeDecoders
 */
exports.registerManufacturerSpecificDataDecoder = function(eirDataTypeDecoders)
{
  const originalDecoder = eirDataTypeDecoders[EirDataType.ManufacturerSpecificData];

  eirDataTypeDecoders[EirDataType.ManufacturerSpecificData] = function(buffer, eirDataStructure)
  {
    const deviceModel = buffer[1];
    const deviceModelDecoder = exports.deviceModelDecoders[deviceModel];

    if (deviceModelDecoder)
    {
      deviceModelDecoder(buffer, eirDataStructure);
    }
    else if (originalDecoder)
    {
      originalDecoder(buffer, eirDataStructure);
    }
  };
};

/**
 * @type {Object<DeviceModel, function(Buffer, EirDataStructure)>}
 */
exports.deviceModelDecoders = {
  [DeviceModel.Beacon]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.Beacon;
    eirDataStructure.modelLabel = 'iNode Beacon';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.EnergyMeter]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.EnergyMeter;
    eirDataStructure.modelLabel = 'iNode Energy Meter';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
    decodeEnergyMeter(buffer, 2, 4, 8, eirDataStructure);
  },
  [DeviceModel.ControlId]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.ControlId;
    eirDataStructure.modelLabel = 'iNode Control ID';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.Nav]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.Nav;
    eirDataStructure.modelLabel = 'iNode Nav';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.CareSensor1]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor1;
    eirDataStructure.modelLabel = 'iNode Care Sensor #1';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, eirDataStructure);
  },
  [DeviceModel.CareSensor2]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor2;
    eirDataStructure.modelLabel = 'iNode Care Sensor #2';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, decodeMotionSensor, decodeMcp9844Temperature, null, eirDataStructure);
  },
  [DeviceModel.CareSensor3]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor3;
    eirDataStructure.modelLabel = 'iNode Care Sensor #3';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(
      buffer,
      decodeMotionSensor,
      decodeSi7021Temperature,
      decodeSi7021Humidity,
      eirDataStructure
    );
  },
  [DeviceModel.CareSensor4]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor4;
    eirDataStructure.modelLabel = 'iNode Care Sensor #4';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, eirDataStructure);
    decodeInput(buffer, 0, eirDataStructure);
  },
  [DeviceModel.CareSensor5]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor5;
    eirDataStructure.modelLabel = 'iNode Care Sensor #5';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, eirDataStructure);

    eirDataStructure.magneticFieldDirection = !!(buffer[0] & 0x08);
    eirDataStructure.magneticField = buffer.readUInt16LE(10);
  },
  [DeviceModel.CareSensor6]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensor6;
    eirDataStructure.modelLabel = 'iNode Care Sensor #6';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, decodeMotionSensor, decodeCsrTemperature, null, eirDataStructure);
    decodeInput(buffer, 0, eirDataStructure);
    decodeOutput(buffer, 0, eirDataStructure);
  },
  [DeviceModel.CareSensorT]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensorT;
    eirDataStructure.modelLabel = 'iNode Care Sensor T';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, null, decodeMcp9844Temperature, null, eirDataStructure);
  },
  [DeviceModel.CareSensorHT]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareSensorHT;
    eirDataStructure.modelLabel = 'iNode Care Sensor HT';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeCareSensor(buffer, null, decodeSi7021Temperature, decodeSi7021Humidity, eirDataStructure);
  },
  [DeviceModel.ControlPoint]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.ControlPoint;
    eirDataStructure.modelLabel = 'iNode Control Point';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.CareRelay]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.CareRelay;
    eirDataStructure.modelLabel = 'iNode Care Relay';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
    decodeOutput(buffer, 0, eirDataStructure);
  },
  [DeviceModel.TransceiverUart]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.TransceiverUart;
    eirDataStructure.modelLabel = 'iNode Transceiver UART';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.TransceiverUsb]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.TransceiverUsb;
    eirDataStructure.modelLabel = 'iNode Transceiver USB';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  },
  [DeviceModel.Gsm]: function(buffer, eirDataStructure)
  {
    eirDataStructure.model = DeviceModel.Gsm;
    eirDataStructure.modelLabel = 'iNode GSM';

    decodeRtto(buffer, 0, eirDataStructure);
    decodeAlarms(buffer, 0, -1, eirDataStructure);
  }
};

function decodeCareSensor(buffer, decodePosition, decodeTemperature, decodeHumidity, eirDataStructure)
{
  decodeAlarms(buffer, 0, 4, eirDataStructure);
  decodeGroups(buffer, 2, eirDataStructure);
  decodeBatteryLevel(buffer, 2, eirDataStructure);

  if (decodePosition)
  {
    decodePosition(buffer, 6, eirDataStructure);
  }

  if (decodeTemperature)
  {
    decodeTemperature(buffer, 8, eirDataStructure);
  }

  if (decodeHumidity)
  {
    decodeHumidity(buffer, 10, eirDataStructure);
  }

  decodeTime(buffer, 12, eirDataStructure);
  decodeSignature(buffer, 16, eirDataStructure);
}

function decodeInput(buffer, i, eirDataStructure)
{
  eirDataStructure.input = !!(buffer[i] & 0x08);
}

function decodeOutput(buffer, i, eirDataStructure)
{
  eirDataStructure.output = !!(buffer[i] & 0x01);
}

function decodeRtto(buffer, i, eirDataStructure)
{
  eirDataStructure.rtto = !!(buffer[i] & 0x02);
}

function decodeAlarms(buffer, batteryI, extendedI, eirDataStructure)
{
  const battery = ((batteryI === -1 ? 0 : buffer[batteryI]) << 13) & 0xC000;
  const extended = extendedI === -1 ? 0 : buffer.readUInt16LE(extendedI);
  const alarms = extended | battery;

  eirDataStructure.alarms = {
    moveAccelerometer: !!(alarms & 0x01),
    levelAccelerometer: !!(alarms & 0x02),
    levelTemperature: !!(alarms & 0x04),
    levelHumidity: !!(alarms & 0x08),
    contactChange: !!(alarms & 0x10),
    moveStopped: !!(alarms & 0x20),
    moveGTimer: !!(alarms & 0x40),
    levelAccelerometerChange: !!(alarms & 0x80),
    levelMagnetChange: !!(alarms & 0x100),
    levelMagnetTimer: !!(alarms & 0x200),
    lowBattery: !!(alarms & 0x8000)
  };
}

function decodeGroups(buffer, i, eirDataStructure)
{
  eirDataStructure.groups = buffer.readUInt16LE(i) & 0x0FFF;
}

function decodeBatteryLevel(buffer, i, eirDataStructure)
{
  const value = (buffer.readUInt16LE(i) >> 12) & 0x0F;

  if (value === 1)
  {
    eirDataStructure.batteryLevel = 100;
  }
  else
  {
    eirDataStructure.batteryLevel = 10 * (Math.min(value, 11) - 1);
  }

  eirDataStructure.batteryVoltage = (eirDataStructure.batteryLevel - 10) * 1.2 / 100 + 1.8;
}

function decodeEnergyMeter(buffer, averageI, sumI, optionsI, eirDataStructure)
{
  const options = buffer.readUInt16LE(optionsI);
  const unit = (options >> 14) & 3;
  let constant = options & 0x3FFF;

  if (unit === 0)
  {
    eirDataStructure.averageUnit = 'kWh';
    eirDataStructure.sumUnit = 'kW';

    if (constant === 0)
    {
      constant = 1000;
    }
  }
  else if (unit === 1)
  {
    eirDataStructure.averageUnit = 'm³';
    eirDataStructure.sumUnit = 'm³';

    if (constant === 0)
    {
      constant = 1000;
    }
  }
  else
  {
    eirDataStructure.averageUnit = 'cnt';
    eirDataStructure.sumUnit = 'cnt';

    if (constant === 0)
    {
      constant = 1;
    }
  }

  eirDataStructure.constant = constant;
  eirDataStructure.average = Math.round(60 * buffer.readUInt16LE(averageI) / constant * 1000) / 1000;
  eirDataStructure.sum = Math.round(buffer.readUInt32LE(sumI) / constant * 1000) / 1000;
}

function decodeMotionSensor(buffer, i, eirDataStructure)
{
  const value = buffer.readUInt16LE(i);
  const x = (value >> 10) & 0x1F;
  const y = (value >> 5) & 0x1F;
  const z = value & 0x1F;

  eirDataStructure.position = {
    motion: !!(value & 0x8000),
    x: x - (x & 0x10 ? 0x1F : 0),
    y: y - (y & 0x10 ? 0x1F : 0),
    z: z - (z & 0x10 ? 0x1F : 0)
  };
}

function decodeCsrTemperature(buffer, i, eirDataStructure)
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

  eirDataStructure.temperature = value;
}

function decodeMcp9844Temperature(buffer, i, eirDataStructure)
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

  eirDataStructure.temperature = Math.round(value * 100) / 100;
}

function decodeSi7021Temperature(buffer, i, eirDataStructure)
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

  eirDataStructure.temperature = Math.round(value * 100) / 100;
}

function decodeSi7021Humidity(buffer, i, eirDataStructure)
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

  eirDataStructure.humidity = Math.round(value * 100) / 100;
}

function decodeTime(buffer, i, eirDataStructure)
{
  const value1 = buffer.readUInt16LE(i) << 16;
  const value2 = buffer.readUInt16LE(i + 2);
  const value = value1 | value2;

  eirDataStructure.time = new Date(value * 1000);
}

function decodeSignature(buffer, i, eirDataStructure)
{
  eirDataStructure.signature = buffer.slice(i, i + 8);
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
 * @property {number} constant
 * @property {number} average
 * @property {number} sum
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
 */

/**
 * @typedef {Object} INodeCareRelayMsd
 * @property {DeviceModel} model
 * @property {string} modelLabel
 * @property {boolean} rtto
 * @property {boolean} alarms.lowBattery
 * @property {boolean} output
 */
