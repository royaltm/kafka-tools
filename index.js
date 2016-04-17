var isString = require('util').isString;

var numeral = require("numeral");

exports.thousands = thousands;
exports.pad = pad;

function thousands(number) {
  return numeral(number).format("0,0");
}

function pad(text, size, fill) {
  text = String(text);
  fill || (fill = ' ');
  if (text.length >= size)
    return text;
  var padstr = new Buffer(size - text.length);
  padstr.fill(fill)
  padstr = padstr.toString('utf-8');
  return padstr + text;
}


var legalChars = "[a-zA-Z0-9\\._\\-]";
var maxNameLength = 255;
var rgx = new RegExp(legalChars + "+");

exports.Topic = {
  InternalTopics: new Set(["__consumer_offsets"]),
  legalChars: legalChars,
  validate: function(topic) {
    if (!isString(topic))
      throw new Error("topic must be a string");
    else if (topic.length <= 0)
      throw new Error("topic name is illegal, can't be empty");
    else if (topic === "." || topic === "..")
      throw new Error("topic name cannot be \".\" or \"..\"");
    else if (topic.length > maxNameLength)
      throw new Error("topic name is illegal, can't be longer than " + maxNameLength + " characters");
    var match = topic.match(rgx);
    if (!match || match[0] !== topic) {
      throw new Error("topic name " + topic +
        " is illegal, contains a character other than ASCII alphanumerics, '.', '_' and '-'");
    }
  }
};

exports.logconfig = require('./lib/logconfig');
exports.Config = require('./lib/config');
exports.Zookeeper = require('./lib/zookeeper');
