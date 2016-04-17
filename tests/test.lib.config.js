var test = require("tap").test;
var Config = require("../index").Config;

test("Config", function(suite) {

  suite.test("define", function(t) {
    var validator = {pattern: /^foo$/i};
    var cfg = new Config().define("foo", validator, "somedocs");
    t.type(cfg.properties[0], 'object')
    t.strictEqual(cfg.properties[0].name, "foo");
    t.strictEqual(cfg.properties[0].validator, validator);
    t.strictEqual(cfg.properties[0].doc, "somedocs");
    t.throws(function() { cfg.validate(); }, {message: "config is not an object"});
    t.throws(function() { cfg.validate(123); }, {message: "config is not an object"});
    t.throws(function() { cfg.validate("goo"); }, {message: "config is not an object"});
    t.throws(function() { cfg.validate({goo: "goo"}); }, {message: 'Unknown configuration "goo".'});
    t.throws(function() { cfg.validate({foo: null}); }, {message: 'configuration value must be a string'});
    t.strictEqual(cfg.validate({}), cfg);
    t.strictEqual(cfg.validate({foo: "foo"}), cfg);
    t.strictEqual(cfg.validate({foo: "FOO"}), cfg);
    t.strictEqual(cfg.validate({foo: "Foo"}), cfg);
    t.end();
  });

  suite.test("INT", function(t) {
    var cfg = new Config().define("foo", Config.INT, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be an INT'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be an INT'});
    t.throws(function() { cfg.validate({foo: "2147483648"}); }, {message: 'configuration "foo" must be an INT'});
    t.throws(function() { cfg.validate({foo: "02147483648"}); }, {message: 'configuration "foo" must be an INT'});
    t.throws(function() { cfg.validate({foo: "-2147483649"}); }, {message: 'configuration "foo" must be an INT'});
    t.throws(function() { cfg.validate({foo: "-02147483649"}); }, {message: 'configuration "foo" must be an INT'});
    t.strictEqual(cfg.validate({foo: "2147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "02147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "0"}), cfg);
    t.strictEqual(cfg.validate({foo: "-2147483648"}), cfg);
    t.strictEqual(cfg.validate({foo: "-02147483648"}), cfg);
    t.end();
  });

  suite.test("INT_NOT_NEGATIVE", function(t) {
    var cfg = new Config().define("foo", Config.INT_NOT_NEGATIVE, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "2147483648"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "02147483648"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-1"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-0"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-00000000000001"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-2147483648"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-02147483648"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-2147483649"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.throws(function() { cfg.validate({foo: "-02147483649"}); }, {message: 'configuration "foo" must be an INT >= 0'});
    t.strictEqual(cfg.validate({foo: "2147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "02147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "0"}), cfg);
    t.end();
  });

  suite.test("INT_1_OR_MORE", function(t) {
    var cfg = new Config().define("foo", Config.INT_1_OR_MORE, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "2147483648"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "02147483648"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-1"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-0"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "0"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-00000000000001"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-2147483648"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-02147483648"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-2147483649"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.throws(function() { cfg.validate({foo: "-02147483649"}); }, {message: 'configuration "foo" must be an INT >= 1'});
    t.strictEqual(cfg.validate({foo: "2147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "02147483647"}), cfg);
    t.strictEqual(cfg.validate({foo: "1"}), cfg);
    t.end();
  });

  suite.test("LONG", function(t) {
    var cfg = new Config().define("foo", Config.LONG, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be a LONG'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be a LONG'});
    t.throws(function() { cfg.validate({foo: "9223372036854775808"}); }, {message: 'configuration "foo" must be a LONG'});
    t.throws(function() { cfg.validate({foo: "09223372036854775808"}); }, {message: 'configuration "foo" must be a LONG'});
    t.throws(function() { cfg.validate({foo: "-9223372036854775809"}); }, {message: 'configuration "foo" must be a LONG'});
    t.throws(function() { cfg.validate({foo: "-09223372036854775809"}); }, {message: 'configuration "foo" must be a LONG'});
    t.strictEqual(cfg.validate({foo: "9223372036854775807"}), cfg);
    t.strictEqual(cfg.validate({foo: "09223372036854775807"}), cfg);
    t.strictEqual(cfg.validate({foo: "0"}), cfg);
    t.strictEqual(cfg.validate({foo: "-9223372036854775808"}), cfg);
    t.strictEqual(cfg.validate({foo: "-09223372036854775808"}), cfg);
    t.end();
  });

  suite.test("LONG_NOT_NEGATIVE", function(t) {
    var cfg = new Config().define("foo", Config.LONG_NOT_NEGATIVE, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "9223372036854775808"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "09223372036854775808"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-1"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-0"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-00000000000001"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-9223372036854775808"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-09223372036854775808"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-9223372036854775809"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.throws(function() { cfg.validate({foo: "-09223372036854775809"}); }, {message: 'configuration "foo" must be a LONG >= 0'});
    t.strictEqual(cfg.validate({foo: "9223372036854775807"}), cfg);
    t.strictEqual(cfg.validate({foo: "09223372036854775807"}), cfg);
    t.strictEqual(cfg.validate({foo: "0"}), cfg);
    t.end();
  });

  suite.test("BOOLEAN", function(t) {
    var cfg = new Config().define("foo", Config.BOOLEAN, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be "true" or "false"'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be "true" or "false"'});
    t.throws(function() { cfg.validate({foo: "0"}); }, {message: 'configuration "foo" must be "true" or "false"'});
    t.throws(function() { cfg.validate({foo: "1"}); }, {message: 'configuration "foo" must be "true" or "false"'});
    t.strictEqual(cfg.validate({foo: "true"}), cfg);
    t.strictEqual(cfg.validate({foo: "false"}), cfg);
    t.end();
  });

  suite.test("DOUBLE_0_1", function(t) {
    var cfg = new Config().define("foo", Config.DOUBLE_0_1, "somedocs");
    t.throws(function() { cfg.validate({foo: 0}); }, {message: "configuration value must be a string"});
    t.throws(function() { cfg.validate({foo: ""}); }, {message: 'configuration "foo" must be a DOUBLE between 0 and 1'});
    t.throws(function() { cfg.validate({foo: "foo"}); }, {message: 'configuration "foo" must be a DOUBLE between 0 and 1'});
    t.throws(function() { cfg.validate({foo: "-0"}); }, {message: 'configuration "foo" must be a DOUBLE between 0 and 1'});
    t.throws(function() { cfg.validate({foo: "2"}); }, {message: 'configuration "foo" must be a DOUBLE between 0 and 1'});
    t.throws(function() { cfg.validate({foo: "-1"}); }, {message: 'configuration "foo" must be a DOUBLE between 0 and 1'});
    t.strictEqual(cfg.validate({foo: "0"}), cfg);
    t.strictEqual(cfg.validate({foo: "0.5"}), cfg);
    t.strictEqual(cfg.validate({foo: "0.00000000000000123456789"}), cfg);
    t.strictEqual(cfg.validate({foo: "1"}), cfg);
    t.end();
  });

  suite.end();
});
