var numeral = require("numeral");

exports.Zookeeper = require('./lib/zookeeper');

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
