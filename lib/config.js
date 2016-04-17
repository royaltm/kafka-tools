var isObject = require('util').isObject;
var isString = require('util').isString;

var pad = require("../index").pad;

function Config() {
  this.properties = [];
  this.names = {};
}

Config.prototype.define = function(name, validator, doc) {
  var index = this.properties.push(new Property(name, validator, doc)) - 1;
  this.names[name] = index;
  return this;
}

Config.prototype.validate = function(config) {
  if (!isObject(config))
    throw new Error("config is not an object");
  for(var name in config) {
    var property = this.properties[this.names[name]];
    if (!property)
      throw new Error("Unknown configuration \"" + name + "\".");
    var value = config[name];
    if (!isString(value))
      throw new Error("configuration value must be a string");
    if (!property.validate(value))
      throw new Error("configuration \"" + name + "\" must be " + property.validator.doc);
  }
  return this;
}

Config.prototype.list = function() {
  var properties = this.properties;
  var names = this.names;
  Object.keys(names).sort().forEach(function(name) {
    var prop = properties[names[name]];
    console.log("%s: %s", prop.name.magenta, prop.doc.grey);
  });
  return this;
}

function Property(name, validator, doc) {
  this.name = name;
  this.validator = validator;
  this.doc = doc;
}

Property.prototype.validate = function(value) {
  if (!isString(value))
    return false;
  var validator = this.validator;
  return validator.pattern.test(value)
      && checkMax(value, validator.max)
      && checkMin(value, validator.min);
}

// max must be a 0 or positive number string
function checkMax(value, max) {
  if (max) {
    if (max.charAt(0) === '-') {
      if (value.charAt(0) !== '-')
        return false;
      return checkMax(max.substr(1), value.substr(1));
    } else {
      if (value.charAt(0) === '-')
        return true;
    }
    var len = Math.max(value.length, max.length);
    max = left0pad(max, len);
    value = left0pad(value, len);
    return value <= max;
  }
  return true;
}

function checkMin(value, min) {
  if (min) {
    if (min.charAt(0) !== '-') {
      // min is 0 or positive
      if (value.charAt(0) === '-')
        return false;
      return checkMax(min, value);
    } else {
    // min is negative
      if (value.charAt(0) !== '-')
        return true;
      return checkMax(value.substr(1), min.substr(1));
    }
  }
  return true;
}

function left0pad(str, len) {
  return pad(str, len, '0');
}

Config.INT = {
  pattern: /^-?\d*$/,
  max: "2147483647",
  min: "-2147483648",
  doc: "an INT"
};

Config.INT_NOT_NEGATIVE = {
  pattern: /^\d*$/,
  max: "2147483647",
  min: "0",
  doc: "an INT >= 0"
};

Config.DOUBLE_0_1 = {
  pattern: /^1$|^0(?:\.\d+)?$/,
  doc: "a DOUBLE between 0 and 1"
};

Config.INT_1_OR_MORE = {
  pattern: /^\d*$/,
  max: "2147483647",
  min: "1",
  doc: "an INT >= 1"
};

Config.LONG_NOT_NEGATIVE = {
  pattern: /^\d*$/,
  max: "9223372036854775807",
  min: "0",
  doc: "a LONG >= 0"
};

Config.LONG = {
  pattern: /^-?\d*$/,
  max: "9223372036854775807",
  min: "-9223372036854775808",
  doc: "a LONG"
};

Config.BOOLEAN = {
  pattern: /^true$|^false$/,
  doc: "\"true\" or \"false\""
};

module.exports = Config;
